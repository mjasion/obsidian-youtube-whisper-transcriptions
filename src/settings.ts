import { App, PluginSettingTab, Setting } from 'obsidian';
import type YouTubeWhisperPlugin from './main';

export interface YouTubeWhisperSettings {
	openaiApiKey: string;
	whisperModel: string;
	defaultStorageLocation: 'dedicated' | 'active-note-folder' | 'insert-active-note';
	dedicatedFolderPath: string;
	enableYouTubeFallback: boolean;
	showCostEstimate: boolean;
}

export const DEFAULT_SETTINGS: YouTubeWhisperSettings = {
	openaiApiKey: '',
	whisperModel: 'whisper-1',
	defaultStorageLocation: 'dedicated',
	dedicatedFolderPath: 'Transcriptions',
	enableYouTubeFallback: true,
	showCostEstimate: true,
};

export class YouTubeWhisperSettingTab extends PluginSettingTab {
	plugin: YouTubeWhisperPlugin;

	constructor(app: App, plugin: YouTubeWhisperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'YouTube Whisper Transcription Settings' });

		// OpenAI API Key
		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc(
				createFragment((frag) => {
					frag.appendText('Your OpenAI API key for Whisper transcription. ');
					frag.createEl('a', {
						text: 'Get API key',
						href: 'https://platform.openai.com/api-keys',
					});
					frag.appendText('. Cost: $0.006 per minute of audio.');
				})
			)
			.addText((text) =>
				text
					.setPlaceholder('sk-...')
					.setValue(this.plugin.settings.openaiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openaiApiKey = value.trim();
						await this.plugin.saveSettings();
					})
			);

		// Whisper Model Selection
		new Setting(containerEl)
			.setName('Whisper Model')
			.setDesc('Select the Whisper model to use for transcription. whisper-1 is recommended.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('whisper-1', 'whisper-1 (recommended)')
					.setValue(this.plugin.settings.whisperModel)
					.onChange(async (value) => {
						this.plugin.settings.whisperModel = value;
						await this.plugin.saveSettings();
					})
			);

		// Default Storage Location
		new Setting(containerEl)
			.setName('Default Storage Location')
			.setDesc('Where to save transcriptions by default.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('dedicated', 'Dedicated folder')
					.addOption('active-note-folder', 'Same folder as active note')
					.addOption('insert-active-note', 'Insert into active note')
					.setValue(this.plugin.settings.defaultStorageLocation)
					.onChange(async (value) => {
						this.plugin.settings.defaultStorageLocation = value as any;
						await this.plugin.saveSettings();
						// Refresh display to show/hide dedicated folder path
						this.display();
					})
			);

		// Dedicated Folder Path (only show if dedicated folder is selected)
		if (this.plugin.settings.defaultStorageLocation === 'dedicated') {
			new Setting(containerEl)
				.setName('Dedicated Folder Path')
				.setDesc('Path to the folder where transcriptions will be saved (relative to vault root).')
				.addText((text) =>
					text
						.setPlaceholder('Transcriptions')
						.setValue(this.plugin.settings.dedicatedFolderPath)
						.onChange(async (value) => {
							this.plugin.settings.dedicatedFolderPath = value;
							await this.plugin.saveSettings();
						})
				);
		}

		// YouTube Fallback
		new Setting(containerEl)
			.setName('Enable YouTube Caption Fallback')
			.setDesc(
				'If YouTube has existing captions, offer to download them instead of using Whisper (saves API costs).'
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableYouTubeFallback).onChange(async (value) => {
					this.plugin.settings.enableYouTubeFallback = value;
					await this.plugin.saveSettings();
				})
			);

		// Cost Estimate
		new Setting(containerEl)
			.setName('Show Cost Estimate')
			.setDesc('Show estimated API cost before starting transcription.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showCostEstimate).onChange(async (value) => {
					this.plugin.settings.showCostEstimate = value;
					await this.plugin.saveSettings();
				})
			);

		// Documentation section
		containerEl.createEl('h3', { text: 'Usage Notes' });
		const usageDiv = containerEl.createDiv();
		usageDiv.createEl('p', {
			text: 'This plugin transcribes YouTube videos using OpenAI Whisper API or downloads existing captions.',
		});
		usageDiv.createEl('p', {
			text: 'Supported video lengths: from minutes to 8+ hours (automatically chunked for large videos).',
		});
		usageDiv.createEl('p', {
			text: 'Desktop only: This plugin requires Node.js APIs and will not work on mobile.',
		});
	}
}
