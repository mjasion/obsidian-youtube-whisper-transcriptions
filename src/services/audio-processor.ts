/**
 * Audio Processor
 * Handles audio download and segmentation for large videos
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import type { AudioSegment } from '../types';

export class AudioProcessor {
	private tempDir: string;

	constructor(tempDir: string) {
		this.tempDir = tempDir;
		this.ensureTempDir();
	}

	/**
	 * Ensure temp directory exists
	 */
	private ensureTempDir(): void {
		if (!fs.existsSync(this.tempDir)) {
			fs.mkdirSync(this.tempDir, { recursive: true });
		}
	}

	/**
	 * Download audio from URL to local file
	 */
	async downloadAudio(
		url: string,
		outputPath: string,
		onProgress?: (downloaded: number, total: number) => void
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const protocol = url.startsWith('https') ? https : http;

			const request = protocol.get(url, (response) => {
				if (response.statusCode === 301 || response.statusCode === 302) {
					// Follow redirect
					const redirectUrl = response.headers.location;
					if (redirectUrl) {
						this.downloadAudio(redirectUrl, outputPath, onProgress)
							.then(resolve)
							.catch(reject);
						return;
					}
				}

				if (response.statusCode !== 200) {
					reject(new Error(`Failed to download audio: HTTP ${response.statusCode}`));
					return;
				}

				const totalSize = parseInt(response.headers['content-length'] || '0', 10);
				let downloadedSize = 0;

				const fileStream = fs.createWriteStream(outputPath);

				response.on('data', (chunk) => {
					downloadedSize += chunk.length;
					if (onProgress && totalSize > 0) {
						onProgress(downloadedSize, totalSize);
					}
				});

				response.pipe(fileStream);

				fileStream.on('finish', () => {
					fileStream.close();
					resolve(outputPath);
				});

				fileStream.on('error', (err) => {
					fs.unlinkSync(outputPath);
					reject(err);
				});
			});

			request.on('error', (err) => {
				reject(err);
			});

			request.setTimeout(300000, () => {
				// 5 minute timeout
				request.destroy();
				reject(new Error('Download timeout'));
			});
		});
	}

	/**
	 * Check if file size exceeds Whisper API limit (25MB)
	 */
	needsSegmentation(filePath: string, maxSizeBytes = 25 * 1024 * 1024): boolean {
		const stats = fs.statSync(filePath);
		return stats.size > maxSizeBytes;
	}

	/**
	 * Estimate if download will exceed size limit based on duration and bitrate
	 * Returns true if segmentation is likely needed
	 */
	shouldSegmentBasedOnDuration(durationSeconds: number, estimatedBitrateKbps = 128): boolean {
		// Estimate file size: (bitrate in kbps * duration in seconds) / 8 / 1024 = size in MB
		const estimatedSizeMB = (estimatedBitrateKbps * durationSeconds) / 8 / 1024;
		const maxSizeMB = 25;

		return estimatedSizeMB > maxSizeMB;
	}

	/**
	 * Calculate segment duration based on total duration
	 * Targets approximately 20MB segments to stay well below 25MB limit
	 */
	calculateSegmentDuration(totalDurationSeconds: number, estimatedBitrateKbps = 128): number {
		// Target 20MB per segment (safety margin below 25MB limit)
		const targetSizeMB = 20;
		const segmentDurationSeconds = Math.floor((targetSizeMB * 8 * 1024) / estimatedBitrateKbps);

		// Minimum 5 minutes, maximum 15 minutes per segment
		const minDuration = 5 * 60;
		const maxDuration = 15 * 60;

		return Math.max(minDuration, Math.min(maxDuration, segmentDurationSeconds));
	}

	/**
	 * Create segment metadata for processing
	 * Since we're downloading full audio, we'll note where segments should be split
	 */
	createSegmentPlan(
		totalDurationSeconds: number,
		segmentDuration?: number
	): AudioSegment[] {
		if (!segmentDuration) {
			segmentDuration = this.calculateSegmentDuration(totalDurationSeconds);
		}

		const segments: AudioSegment[] = [];
		let startTime = 0;

		while (startTime < totalDurationSeconds) {
			const endTime = Math.min(startTime + segmentDuration, totalDurationSeconds);
			const duration = endTime - startTime;

			segments.push({
				filePath: '', // Will be set when segment is created
				startTime,
				endTime,
				duration,
			});

			startTime = endTime;
		}

		return segments;
	}

	/**
	 * Get temp file path for audio
	 */
	getTempAudioPath(videoId: string, extension = 'webm'): string {
		return path.join(this.tempDir, `${videoId}-audio.${extension}`);
	}

	/**
	 * Get temp file path for segment
	 */
	getTempSegmentPath(videoId: string, segmentIndex: number, extension = 'webm'): string {
		return path.join(this.tempDir, `${videoId}-segment-${segmentIndex}.${extension}`);
	}

	/**
	 * Clean up temporary files
	 */
	cleanup(filePaths: string[]): void {
		for (const filePath of filePaths) {
			try {
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			} catch (error) {
				console.error(`Failed to delete temp file ${filePath}:`, error);
			}
		}
	}

	/**
	 * Clean up all temp files for a video
	 */
	cleanupVideoFiles(videoId: string): void {
		try {
			const files = fs.readdirSync(this.tempDir);
			const videoFiles = files.filter((file) => file.startsWith(videoId));

			for (const file of videoFiles) {
				const filePath = path.join(this.tempDir, file);
				try {
					fs.unlinkSync(filePath);
				} catch (error) {
					console.error(`Failed to delete ${filePath}:`, error);
				}
			}
		} catch (error) {
			console.error('Error cleaning up video files:', error);
		}
	}
}
