/**
 * Shared TypeScript types for the YouTube Whisper Transcription plugin
 */

export interface VideoMetadata {
	videoId: string;
	title: string;
	duration: number; // in seconds
	language: string;
	url: string;
	hasYouTubeCaptions: boolean;
}

export interface TranscriptionProgress {
	step: 'downloading' | 'extracting' | 'chunking' | 'transcribing' | 'saving';
	stepProgress: number; // 0-100
	overallProgress: number; // 0-100
	currentChunk?: number;
	totalChunks?: number;
	estimatedTimeRemaining?: number; // seconds
	cancellable: boolean;
	message?: string;
}

export interface TranscriptionResult {
	text: string;
	language: string;
	duration: number;
	method: 'whisper' | 'youtube';
	model?: string; // For Whisper transcriptions
	timestamp: string; // ISO 8601
}

export interface TranscriptionError {
	category: 'config' | 'network' | 'api' | 'filesystem' | 'processing';
	message: string; // User-friendly
	detail: string; // Technical detail for console
	action?: {
		label: string;
		callback: () => void;
	};
}

export type TranscriptionMethod = 'whisper' | 'youtube' | 'both';

export interface AudioSegment {
	filePath: string;
	startTime: number; // seconds
	endTime: number; // seconds
	duration: number; // seconds
}
