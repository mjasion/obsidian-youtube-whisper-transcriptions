/**
 * Transcription Orchestrator
 * Coordinates the entire transcription workflow
 */

import { App, Modal, Notice, Setting } from 'obsidian';
import * as path from 'path';
import * as os from 'os';
import type { YouTubeWhisperSettings } from '../settings';
import type { VideoMetadata, TranscriptionMethod, TranscriptionResult } from '../types';
import { parseYouTubeUrl } from '../utils/youtube-url-parser';
import { createError, handleError, showError, showSuccess, showInfo } from '../utils/error-handler';
import { YouTubeService } from '../services/youtube-service';
import { AudioProcessor } from '../services/audio-processor';
import { WhisperService } from '../services/whisper-service';
import { TranscriptionStorage } from '../storage/transcription-storage';
import { ProgressModal } from '../ui/progress-modal';

export class TranscriptionOrchestrator {
	private app: App;
	private settings: YouTubeWhisperSettings;
	private youtubeService: YouTubeService;
	private storage: TranscriptionStorage;
	private tempDir: string;
	private isCancelled: boolean = false;

	constructor(app: App, settings: YouTubeWhisperSettings) {
		this.app = app;
		this.settings = settings;
		this.youtubeService = new YouTubeService();
		this.storage = new TranscriptionStorage(app, settings);
		this.tempDir = path.join(os.tmpdir(), 'obsidian-youtube-whisper');
	}

	/**
	 * Main entry point - prompts user for URL and starts transcription
	 */
	async startTranscription(): Promise<void> {
		// Prompt for YouTube URL
		const url = await this.promptForUrl();
		if (!url) {
			return; // User cancelled
		}

		// Parse URL
		const parsed = parseYouTubeUrl(url);
		if (!parsed) {
			showError('Invalid YouTube URL. Please check the URL and try again.');
			return;
		}

		try {
			// Fetch video metadata
			showInfo('Fetching video information...');
			const metadata = await this.youtubeService.getVideoMetadata(parsed.videoId);

			// Check if already transcribed
			const existing = await this.storage.findExistingTranscription(metadata.videoId);
			if (existing) {
				const shouldContinue = await this.promptOverwrite(existing.path);
				if (!shouldContinue) {
					return;
				}
			}

			// Ask for transcription method
			const method = await this.promptForMethod(metadata);
			if (!method) {
				return; // User cancelled
			}

			// Show cost estimate if enabled and using Whisper
			if (this.settings.showCostEstimate && (method === 'whisper' || method === 'both')) {
				const shouldContinue = await this.showCostEstimate(metadata);
				if (!shouldContinue) {
					return;
				}
			}

			// Execute transcription
			await this.executeTranscription(metadata, method);
		} catch (error) {
			const err = createError('processing', error, 'transcription workflow');
			handleError(err);
		}
	}

	/**
	 * Execute the transcription based on method
	 */
	private async executeTranscription(
		metadata: VideoMetadata,
		method: TranscriptionMethod
	): Promise<void> {
		const progressModal = new ProgressModal(this.app, 'Transcribing Video');
		progressModal.open();

		this.isCancelled = false;
		progressModal.showCancelButton(() => {
			this.isCancelled = true;
			progressModal.updateMessage('Cancelling...');
		});

		try {
			switch (method) {
				case 'whisper':
					await this.transcribeWithWhisper(metadata, progressModal);
					break;

				case 'youtube':
					await this.transcribeWithYouTube(metadata, progressModal);
					break;

				case 'both':
					await this.transcribeBoth(metadata, progressModal);
					break;
			}

			if (!this.isCancelled) {
				progressModal.markComplete('Transcription saved successfully!');
				setTimeout(() => progressModal.close(), 2000);
			}
		} catch (error) {
			if (!this.isCancelled) {
				const err = createError('processing', error, 'transcription execution');
				progressModal.markError(err.message);
				console.error(err.detail);
			}
		} finally {
			// Cleanup temp files
			const audioProcessor = new AudioProcessor(this.tempDir);
			audioProcessor.cleanupVideoFiles(metadata.videoId);
		}
	}

	/**
	 * Transcribe using Whisper API
	 */
	private async transcribeWithWhisper(
		metadata: VideoMetadata,
		progressModal: ProgressModal
	): Promise<void> {
		progressModal.updateProgress(10, 'Getting audio stream URL...');

		// Get audio URL
		const audioUrl = await this.youtubeService.getAudioStreamUrl(metadata.videoId);

		progressModal.updateProgress(20, 'Downloading audio...');

		// Download audio
		const audioProcessor = new AudioProcessor(this.tempDir);
		const audioPath = audioProcessor.getTempAudioPath(metadata.videoId);

		await audioProcessor.downloadAudio(audioUrl, audioPath, (downloaded, total) => {
			if (this.isCancelled) return;
			const percentage = 20 + (downloaded / total) * 30; // 20-50%
			progressModal.updateProgress(percentage, `Downloading audio... ${Math.round((downloaded / total) * 100)}%`);
		});

		if (this.isCancelled) return;

		progressModal.updateProgress(50, 'Preparing transcription...');

		// Check if needs segmentation
		const needsSegmentation = audioProcessor.needsSegmentation(audioPath);

		// Transcribe
		const whisperService = new WhisperService(this.settings.openaiApiKey, this.settings.whisperModel);

		let transcription: TranscriptionResult;

		if (needsSegmentation) {
			// TODO: Implement audio segmentation with ffmpeg
			// For now, show error
			throw new Error(
				'Audio file is too large for direct transcription. Audio segmentation with ffmpeg will be implemented in a future update. Maximum file size: 25MB.'
			);
		} else {
			transcription = await whisperService.transcribe(audioPath, metadata.language, (progress) => {
				if (this.isCancelled) return;
				progressModal.updateProgress(75, progress);
			});
		}

		if (this.isCancelled) return;

		progressModal.updateProgress(90, 'Saving transcription...');

		// Save transcription
		const filePath = await this.storage.saveTranscription(transcription, metadata);

		progressModal.updateProgress(100, `Saved to ${filePath}`);
		showSuccess(`Transcription saved to ${filePath}`);
	}

	/**
	 * Transcribe using YouTube captions
	 */
	private async transcribeWithYouTube(
		metadata: VideoMetadata,
		progressModal: ProgressModal
	): Promise<void> {
		progressModal.updateProgress(30, 'Downloading YouTube captions...');

		const captions = await this.youtubeService.getCaptions(metadata.videoId);

		if (!captions) {
			throw new Error('No captions available for this video. Please use Whisper transcription instead.');
		}

		if (this.isCancelled) return;

		progressModal.updateProgress(70, 'Formatting transcription...');

		const transcription: TranscriptionResult = {
			text: captions.text,
			language: captions.language,
			duration: metadata.duration,
			method: 'youtube',
			timestamp: new Date().toISOString(),
		};

		progressModal.updateProgress(90, 'Saving transcription...');

		const filePath = await this.storage.saveTranscription(transcription, metadata);

		progressModal.updateProgress(100, `Saved to ${filePath}`);
		showSuccess(`Transcription saved to ${filePath}`);
	}

	/**
	 * Transcribe using both methods for comparison
	 */
	private async transcribeBoth(
		metadata: VideoMetadata,
		progressModal: ProgressModal
	): Promise<void> {
		// Download YouTube captions first (faster)
		progressModal.updateProgress(10, 'Downloading YouTube captions...');
		const captions = await this.youtubeService.getCaptions(metadata.videoId);

		if (!captions) {
			throw new Error('No YouTube captions available. Cannot create comparison.');
		}

		const youtubeTranscription: TranscriptionResult = {
			text: captions.text,
			language: captions.language,
			duration: metadata.duration,
			method: 'youtube',
			timestamp: new Date().toISOString(),
		};

		// Then transcribe with Whisper (slower)
		progressModal.updateProgress(30, 'Getting audio stream URL...');
		const audioUrl = await this.youtubeService.getAudioStreamUrl(metadata.videoId);

		progressModal.updateProgress(35, 'Downloading audio...');
		const audioProcessor = new AudioProcessor(this.tempDir);
		const audioPath = audioProcessor.getTempAudioPath(metadata.videoId);

		await audioProcessor.downloadAudio(audioUrl, audioPath, (downloaded, total) => {
			if (this.isCancelled) return;
			const percentage = 35 + (downloaded / total) * 20; // 35-55%
			progressModal.updateProgress(percentage, `Downloading audio... ${Math.round((downloaded / total) * 100)}%`);
		});

		if (this.isCancelled) return;

		progressModal.updateProgress(55, 'Transcribing with Whisper...');

		const whisperService = new WhisperService(this.settings.openaiApiKey, this.settings.whisperModel);
		const whisperTranscription = await whisperService.transcribe(audioPath, metadata.language, (progress) => {
			if (this.isCancelled) return;
			progressModal.updateProgress(80, progress);
		});

		if (this.isCancelled) return;

		progressModal.updateProgress(90, 'Saving comparison...');

		const filePath = await this.storage.saveComparison(
			whisperTranscription,
			youtubeTranscription,
			metadata
		);

		progressModal.updateProgress(100, `Saved to ${filePath}`);
		showSuccess(`Comparison saved to ${filePath}`);
	}

	/**
	 * Prompt user for YouTube URL
	 */
	private async promptForUrl(): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Transcribe YouTube Video');

			let inputEl: HTMLInputElement;

			new Setting(modal.contentEl)
				.setName('YouTube URL')
				.setDesc('Enter the URL of the YouTube video to transcribe')
				.addText((text) => {
					inputEl = text.inputEl;
					text.setPlaceholder('https://www.youtube.com/watch?v=...')
						.onChange((value) => {
							// Could add real-time validation here
						});
					text.inputEl.style.width = '100%';
					text.inputEl.focus();
				});

			new Setting(modal.contentEl)
				.addButton((btn) =>
					btn
						.setButtonText('Cancel')
						.onClick(() => {
							modal.close();
							resolve(null);
						})
				)
				.addButton((btn) =>
					btn
						.setButtonText('Continue')
						.setCta()
						.onClick(() => {
							const url = inputEl.value.trim();
							modal.close();
							resolve(url || null);
						})
				);

			modal.open();
		});
	}

	/**
	 * Prompt user for transcription method
	 */
	private async promptForMethod(metadata: VideoMetadata): Promise<TranscriptionMethod | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Select Transcription Method');

			const contentEl = modal.contentEl;
			contentEl.createEl('p', {
				text: `Video: ${metadata.title}`,
				cls: 'youtube-whisper-video-title',
			});
			contentEl.createEl('p', {
				text: `Duration: ${Math.floor(metadata.duration / 60)} minutes`,
			});

			let selectedMethod: TranscriptionMethod = 'whisper';

			new Setting(contentEl)
				.setName('Transcription method')
				.setDesc('Choose how to transcribe this video')
				.addDropdown((dropdown) => {
					dropdown.addOption('whisper', 'Whisper API (most accurate)');

					if (metadata.hasYouTubeCaptions) {
						dropdown.addOption('youtube', 'YouTube Captions (free, faster)');
						dropdown.addOption('both', 'Both (for comparison)');
					}

					dropdown.onChange((value) => {
						selectedMethod = value as TranscriptionMethod;
					});
				});

			new Setting(contentEl)
				.addButton((btn) =>
					btn
						.setButtonText('Cancel')
						.onClick(() => {
							modal.close();
							resolve(null);
						})
				)
				.addButton((btn) =>
					btn
						.setButtonText('Start Transcription')
						.setCta()
						.onClick(() => {
							modal.close();
							resolve(selectedMethod);
						})
				);

			modal.open();
		});
	}

	/**
	 * Show cost estimate and confirm
	 */
	private async showCostEstimate(metadata: VideoMetadata): Promise<boolean> {
		const whisperService = new WhisperService(this.settings.openaiApiKey);
		const cost = whisperService.estimateCost(metadata.duration);
		const formattedCost = whisperService.formatCost(cost);

		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Cost Estimate');

			const contentEl = modal.contentEl;
			contentEl.createEl('p', {
				text: `Estimated cost for transcribing this ${Math.floor(metadata.duration / 60)}-minute video:`,
			});
			contentEl.createEl('h3', {
				text: formattedCost,
				cls: 'youtube-whisper-cost-estimate',
			});
			contentEl.createEl('p', {
				text: 'This is an estimate based on OpenAI Whisper API pricing ($0.006 per minute).',
				cls: 'setting-item-description',
			});

			new Setting(contentEl)
				.addButton((btn) =>
					btn
						.setButtonText('Cancel')
						.onClick(() => {
							modal.close();
							resolve(false);
						})
				)
				.addButton((btn) =>
					btn
						.setButtonText('Continue')
						.setCta()
						.onClick(() => {
							modal.close();
							resolve(true);
						})
				);

			modal.open();
		});
	}

	/**
	 * Prompt user about overwriting existing transcription
	 */
	private async promptOverwrite(existingPath: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Video Already Transcribed');

			const contentEl = modal.contentEl;
			contentEl.createEl('p', {
				text: 'This video has already been transcribed:',
			});
			contentEl.createEl('p', {
				text: existingPath,
				cls: 'youtube-whisper-existing-path',
			});
			contentEl.createEl('p', {
				text: 'Do you want to transcribe it again?',
			});

			new Setting(contentEl)
				.addButton((btn) =>
					btn
						.setButtonText('Cancel')
						.onClick(() => {
							modal.close();
							resolve(false);
						})
				)
				.addButton((btn) =>
					btn
						.setButtonText('Open Existing')
						.onClick(() => {
							this.app.workspace.openLinkText(existingPath, '', false);
							modal.close();
							resolve(false);
						})
				)
				.addButton((btn) =>
					btn
						.setButtonText('Transcribe Again')
						.setWarning()
						.onClick(() => {
							modal.close();
							resolve(true);
						})
				);

			modal.open();
		});
	}

	/**
	 * Update settings
	 */
	updateSettings(settings: YouTubeWhisperSettings): void {
		this.settings = settings;
		this.storage.updateSettings(settings);
	}
}
