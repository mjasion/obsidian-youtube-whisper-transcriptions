import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, YouTubeWhisperSettings, YouTubeWhisperSettingTab } from './settings';
import { TranscriptionOrchestrator } from './commands/transcription-orchestrator';

export default class YouTubeWhisperPlugin extends Plugin {
	settings: YouTubeWhisperSettings;
	orchestrator: TranscriptionOrchestrator;

	async onload() {
		console.log('Loading YouTube Whisper Transcription plugin');

		// Load settings
		await this.loadSettings();

		// Initialize orchestrator
		this.orchestrator = new TranscriptionOrchestrator(this.app, this.settings);

		// Add settings tab
		this.addSettingTab(new YouTubeWhisperSettingTab(this.app, this));

		// Add ribbon icon
		this.addRibbonIcon('video', 'Transcribe YouTube video', () => {
			this.transcribeYouTubeVideo();
		});

		// Add command
		this.addCommand({
			id: 'transcribe-youtube-video',
			name: 'Transcribe YouTube video',
			callback: () => {
				this.transcribeYouTubeVideo();
			},
		});

		console.log('YouTube Whisper Transcription plugin loaded');
	}

	onunload() {
		console.log('Unloading YouTube Whisper Transcription plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Update orchestrator with new settings
		if (this.orchestrator) {
			this.orchestrator.updateSettings(this.settings);
		}
	}

	async transcribeYouTubeVideo() {
		try {
			await this.orchestrator.startTranscription();
		} catch (error) {
			console.error('Error starting transcription:', error);
		}
	}
}
