import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, YouTubeWhisperSettings, YouTubeWhisperSettingTab } from './settings';

export default class YouTubeWhisperPlugin extends Plugin {
	settings: YouTubeWhisperSettings;

	async onload() {
		console.log('Loading YouTube Whisper Transcription plugin');

		// Load settings
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new YouTubeWhisperSettingTab(this.app, this));

		// Add ribbon icon
		this.addRibbonIcon('video', 'Transcribe YouTube video', () => {
			new Notice('YouTube transcription command - coming soon!');
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
	}

	async transcribeYouTubeVideo() {
		// Placeholder for transcription functionality
		new Notice('Transcription functionality coming soon!');

		// TODO: Implement transcription workflow
		// 1. Prompt for YouTube URL
		// 2. Validate URL and extract video ID
		// 3. Fetch video metadata
		// 4. Ask user for transcription method (Whisper, YouTube, or Both)
		// 5. Show cost estimate if enabled
		// 6. Execute transcription
		// 7. Save results to vault
	}
}
