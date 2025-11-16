/**
 * YouTube URL Parser
 * Extracts video ID from various YouTube URL formats
 */

export interface ParsedYouTubeUrl {
	videoId: string;
	timestamp?: number; // in seconds
	playlistId?: string;
}

/**
 * Parse a YouTube URL and extract the video ID
 * Supports multiple URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&t=123s
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
	try {
		// Clean up the URL
		const trimmedUrl = url.trim();

		// Try to parse as URL
		let urlObj: URL;
		try {
			urlObj = new URL(trimmedUrl);
		} catch {
			// If not a valid URL, return null
			return null;
		}

		// Check if it's a YouTube domain
		const hostname = urlObj.hostname.toLowerCase();
		const validDomains = [
			'youtube.com',
			'www.youtube.com',
			'm.youtube.com',
			'youtu.be',
			'www.youtu.be',
		];

		if (!validDomains.some((domain) => hostname === domain || hostname.endsWith('.' + domain))) {
			return null;
		}

		let videoId: string | null = null;
		let timestamp: number | undefined;
		let playlistId: string | undefined;

		// Extract video ID based on URL format
		if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
			// Short URL format: https://youtu.be/VIDEO_ID
			videoId = urlObj.pathname.slice(1).split('/')[0];
		} else if (urlObj.pathname.includes('/embed/')) {
			// Embed format: https://www.youtube.com/embed/VIDEO_ID
			videoId = urlObj.pathname.split('/embed/')[1]?.split('/')[0];
		} else if (urlObj.pathname.includes('/v/')) {
			// Old format: https://www.youtube.com/v/VIDEO_ID
			videoId = urlObj.pathname.split('/v/')[1]?.split('/')[0];
		} else if (urlObj.pathname.includes('/watch')) {
			// Standard format: https://www.youtube.com/watch?v=VIDEO_ID
			videoId = urlObj.searchParams.get('v');
		} else if (urlObj.pathname.includes('/shorts/')) {
			// Shorts format: https://www.youtube.com/shorts/VIDEO_ID
			videoId = urlObj.pathname.split('/shorts/')[1]?.split('/')[0];
		}

		// Validate video ID format (11 characters, alphanumeric, dashes, underscores)
		if (!videoId || !isValidVideoId(videoId)) {
			return null;
		}

		// Extract timestamp if present
		const timeParam = urlObj.searchParams.get('t');
		if (timeParam) {
			timestamp = parseTimestamp(timeParam);
		}

		// Extract playlist ID if present
		const listParam = urlObj.searchParams.get('list');
		if (listParam) {
			playlistId = listParam;
		}

		return {
			videoId,
			timestamp,
			playlistId,
		};
	} catch (error) {
		console.error('Error parsing YouTube URL:', error);
		return null;
	}
}

/**
 * Validate YouTube video ID format
 * YouTube video IDs are 11 characters long and contain alphanumeric characters, dashes, and underscores
 */
export function isValidVideoId(videoId: string): boolean {
	if (!videoId || videoId.length !== 11) {
		return false;
	}

	// YouTube video IDs contain: A-Z, a-z, 0-9, -, _
	const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
	return videoIdPattern.test(videoId);
}

/**
 * Parse timestamp parameter to seconds
 * Supports formats: 123, 123s, 2m3s, 1h2m3s
 */
function parseTimestamp(timeStr: string): number | undefined {
	try {
		// Remove trailing 's' if present and try parsing as number
		const numOnly = timeStr.replace(/s$/, '');
		const asNumber = parseInt(numOnly, 10);
		if (!isNaN(asNumber)) {
			return asNumber;
		}

		// Parse complex formats like 1h2m3s
		let totalSeconds = 0;
		const hourMatch = timeStr.match(/(\d+)h/);
		const minuteMatch = timeStr.match(/(\d+)m/);
		const secondMatch = timeStr.match(/(\d+)s/);

		if (hourMatch) {
			totalSeconds += parseInt(hourMatch[1], 10) * 3600;
		}
		if (minuteMatch) {
			totalSeconds += parseInt(minuteMatch[1], 10) * 60;
		}
		if (secondMatch) {
			totalSeconds += parseInt(secondMatch[1], 10);
		}

		return totalSeconds > 0 ? totalSeconds : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Build a clean YouTube URL from video ID
 */
export function buildYouTubeUrl(videoId: string, timestamp?: number): string {
	let url = `https://www.youtube.com/watch?v=${videoId}`;
	if (timestamp && timestamp > 0) {
		url += `&t=${timestamp}s`;
	}
	return url;
}
