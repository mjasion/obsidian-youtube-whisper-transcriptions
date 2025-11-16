/**
 * Whisper Service
 * Handles OpenAI Whisper API transcription
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import type { TranscriptionResult } from '../types';

export class WhisperService {
	private client: OpenAI | null = null;
	private apiKey: string;
	private model: string;

	constructor(apiKey: string, model = 'whisper-1') {
		this.apiKey = apiKey;
		this.model = model;
	}

	/**
	 * Initialize OpenAI client
	 */
	private initializeClient(): void {
		if (this.client) {
			return;
		}

		if (!this.apiKey || !this.apiKey.startsWith('sk-')) {
			throw new Error('Invalid OpenAI API key format. API key must start with "sk-"');
		}

		this.client = new OpenAI({
			apiKey: this.apiKey,
		});
	}

	/**
	 * Transcribe a single audio file
	 */
	async transcribe(
		audioFilePath: string,
		language?: string,
		onProgress?: (progress: string) => void
	): Promise<TranscriptionResult> {
		this.initializeClient();

		if (!this.client) {
			throw new Error('OpenAI client not initialized');
		}

		// Check file exists and size
		if (!fs.existsSync(audioFilePath)) {
			throw new Error(`Audio file not found: ${audioFilePath}`);
		}

		const stats = fs.statSync(audioFilePath);
		const fileSizeMB = stats.size / (1024 * 1024);

		if (fileSizeMB > 25) {
			throw new Error(
				`Audio file too large (${fileSizeMB.toFixed(1)}MB). Maximum is 25MB. Please use chunking.`
			);
		}

		if (onProgress) {
			onProgress('Uploading audio to OpenAI...');
		}

		try {
			const file = fs.createReadStream(audioFilePath);

			const transcription = await this.client.audio.transcriptions.create({
				file: file,
				model: this.model,
				language: language,
				response_format: 'verbose_json',
				timestamp_granularities: ['segment'],
			});

			if (onProgress) {
				onProgress('Transcription complete');
			}

			// Format the transcription with timestamps
			const formattedText = this.formatTranscriptionWithTimestamps(transcription);

			const result: TranscriptionResult = {
				text: formattedText,
				language: transcription.language || language || 'unknown',
				duration: transcription.duration || 0,
				method: 'whisper',
				model: this.model,
				timestamp: new Date().toISOString(),
			};

			return result;
		} catch (error: any) {
			// Handle specific OpenAI errors
			if (error.status === 401) {
				throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
			} else if (error.status === 429) {
				throw new Error('Rate limit exceeded. Please wait and try again later.');
			} else if (error.status === 402) {
				throw new Error('Insufficient credits. Please add credits to your OpenAI account.');
			} else if (error.code === 'insufficient_quota') {
				throw new Error('API quota exceeded. Please check your OpenAI billing and limits.');
			}

			console.error('Whisper API error:', error);
			throw new Error(`Transcription failed: ${error.message}`);
		}
	}

	/**
	 * Transcribe audio in chunks for large files
	 */
	async transcribeChunks(
		audioChunkPaths: string[],
		language?: string,
		onProgress?: (currentChunk: number, totalChunks: number, chunkProgress: string) => void
	): Promise<TranscriptionResult> {
		this.initializeClient();

		const transcriptions: any[] = [];
		let totalDuration = 0;

		for (let i = 0; i < audioChunkPaths.length; i++) {
			const chunkPath = audioChunkPaths[i];

			if (onProgress) {
				onProgress(i + 1, audioChunkPaths.length, `Transcribing chunk ${i + 1}...`);
			}

			try {
				const result = await this.transcribe(chunkPath, language, (progress) => {
					if (onProgress) {
						onProgress(i + 1, audioChunkPaths.length, progress);
					}
				});

				transcriptions.push(result);
				totalDuration += result.duration;
			} catch (error) {
				// Retry failed chunk up to 3 times
				let retrySuccess = false;
				for (let retry = 1; retry <= 3; retry++) {
					try {
						if (onProgress) {
							onProgress(
								i + 1,
								audioChunkPaths.length,
								`Retrying chunk ${i + 1} (attempt ${retry}/3)...`
							);
						}

						// Wait before retry (exponential backoff)
						await this.sleep(retry * 2000);

						const result = await this.transcribe(chunkPath, language);
						transcriptions.push(result);
						totalDuration += result.duration;
						retrySuccess = true;
						break;
					} catch (retryError) {
						console.error(`Retry ${retry} failed for chunk ${i + 1}:`, retryError);
						if (retry === 3) {
							throw new Error(
								`Failed to transcribe chunk ${i + 1} after 3 retries: ${error.message}`
							);
						}
					}
				}

				if (!retrySuccess) {
					throw error;
				}
			}
		}

		// Merge transcriptions
		const mergedText = transcriptions.map((t) => t.text).join('\n\n');

		const result: TranscriptionResult = {
			text: mergedText,
			language: transcriptions[0]?.language || language || 'unknown',
			duration: totalDuration,
			method: 'whisper',
			model: this.model,
			timestamp: new Date().toISOString(),
		};

		return result;
	}

	/**
	 * Estimate cost for transcription based on duration
	 * Current pricing: $0.006 per minute
	 */
	estimateCost(durationSeconds: number): number {
		const minutes = durationSeconds / 60;
		const costPerMinute = 0.006;
		return minutes * costPerMinute;
	}

	/**
	 * Format cost as string
	 */
	formatCost(cost: number): string {
		return `$${cost.toFixed(2)}`;
	}

	/**
	 * Format transcription with timestamps from verbose response
	 */
	private formatTranscriptionWithTimestamps(transcription: any): string {
		if (!transcription.segments || transcription.segments.length === 0) {
			return transcription.text || '';
		}

		const formattedSegments = transcription.segments.map((segment: any) => {
			const timestamp = this.formatTimestamp(segment.start);
			return `[${timestamp}] ${segment.text.trim()}`;
		});

		return formattedSegments.join('\n');
	}

	/**
	 * Format seconds to MM:SS or HH:MM:SS
	 */
	private formatTimestamp(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		} else {
			return `${minutes}:${secs.toString().padStart(2, '0')}`;
		}
	}

	/**
	 * Sleep utility for retries
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
