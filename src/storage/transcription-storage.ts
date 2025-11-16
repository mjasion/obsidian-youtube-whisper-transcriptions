/**
 * Transcription Storage
 * Handles saving transcriptions to the vault
 */

import { App, Notice, normalizePath, TFile, MarkdownView } from 'obsidian';
import type { VideoMetadata, TranscriptionResult } from '../types';
import type { YouTubeWhisperSettings } from '../settings';
import { formatTranscriptionMarkdown, formatComparisonMarkdown } from '../utils/markdown-formatter';
import { generateFilename, getUniqueFilename, ensureFolderExists, getActiveNoteFolder, isValidVaultPath } from '../utils/file-naming';

export class TranscriptionStorage {
	private app: App;
	private settings: YouTubeWhisperSettings;

	constructor(app: App, settings: YouTubeWhisperSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Save a single transcription to the vault
	 */
	async saveTranscription(
		transcription: TranscriptionResult,
		metadata: VideoMetadata
	): Promise<string> {
		// Format the transcription as Markdown
		const content = formatTranscriptionMarkdown(transcription, metadata);

		// Determine where to save based on settings
		const location = this.settings.defaultStorageLocation;

		switch (location) {
			case 'dedicated':
				return await this.saveToDedicatedFolder(content, metadata, transcription.method);

			case 'active-note-folder':
				return await this.saveToActiveNoteFolder(content, metadata, transcription.method);

			case 'insert-active-note':
				return await this.insertIntoActiveNote(content);

			default:
				throw new Error(`Unknown storage location: ${location}`);
		}
	}

	/**
	 * Save a comparison of two transcriptions
	 */
	async saveComparison(
		whisperTranscription: TranscriptionResult,
		youtubeTranscription: TranscriptionResult,
		metadata: VideoMetadata
	): Promise<string> {
		// Format the comparison as Markdown
		const content = formatComparisonMarkdown(
			whisperTranscription,
			youtubeTranscription,
			metadata
		);

		// Determine where to save based on settings
		const location = this.settings.defaultStorageLocation;

		switch (location) {
			case 'dedicated':
				return await this.saveToDedicatedFolder(content, metadata, 'both');

			case 'active-note-folder':
				return await this.saveToActiveNoteFolder(content, metadata, 'both');

			case 'insert-active-note':
				return await this.insertIntoActiveNote(content);

			default:
				throw new Error(`Unknown storage location: ${location}`);
		}
	}

	/**
	 * Save to dedicated transcriptions folder
	 */
	private async saveToDedicatedFolder(
		content: string,
		metadata: VideoMetadata,
		method: 'whisper' | 'youtube' | 'both'
	): Promise<string> {
		const folderPath = this.settings.dedicatedFolderPath || 'Transcriptions';

		// Validate path
		if (!isValidVaultPath(folderPath)) {
			throw new Error(`Invalid folder path: ${folderPath}`);
		}

		// Ensure folder exists
		await ensureFolderExists(this.app, folderPath);

		// Generate filename
		const baseFilename = generateFilename(metadata.title, method);
		const uniqueFilename = await getUniqueFilename(this.app, folderPath, baseFilename);

		// Create file
		const filePath = normalizePath(`${folderPath}/${uniqueFilename}`);
		const file = await this.app.vault.create(filePath, content);

		return file.path;
	}

	/**
	 * Save to same folder as active note
	 */
	private async saveToActiveNoteFolder(
		content: string,
		metadata: VideoMetadata,
		method: 'whisper' | 'youtube' | 'both'
	): Promise<string> {
		const folderPath = getActiveNoteFolder(this.app);

		if (!folderPath) {
			throw new Error(
				'No active note found. Please open a note or change storage location in settings.'
			);
		}

		// Validate path
		if (!isValidVaultPath(folderPath)) {
			throw new Error(`Invalid folder path: ${folderPath}`);
		}

		// Generate filename
		const baseFilename = generateFilename(metadata.title, method);
		const uniqueFilename = await getUniqueFilename(this.app, folderPath, baseFilename);

		// Create file
		const filePath = normalizePath(`${folderPath}/${uniqueFilename}`);
		const file = await this.app.vault.create(filePath, content);

		return file.path;
	}

	/**
	 * Insert transcription into active note
	 */
	private async insertIntoActiveNote(content: string): Promise<string> {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			throw new Error(
				'No active note found. Please open a note or change storage location in settings.'
			);
		}

		// Read current content
		const currentContent = await this.app.vault.read(activeFile);

		// Append transcription with separator
		const separator = '\n\n---\n\n';
		const newContent = currentContent + separator + content;

		// Update file
		await this.app.vault.modify(activeFile, newContent);

		// Scroll to end of note (if possible)
		const leaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (leaf) {
			// Scroll to bottom
			const editor = leaf.editor;
			if (editor) {
				const lastLine = editor.lastLine();
				editor.setCursor(lastLine);
			}
		}

		return activeFile.path;
	}

	/**
	 * Check if a video has already been transcribed
	 * Returns the file if found, null otherwise
	 */
	async findExistingTranscription(videoId: string): Promise<TFile | null> {
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);

				// Check frontmatter for video_id
				if (content.includes(`video_id: ${videoId}`)) {
					return file;
				}
			} catch (error) {
				// Skip files that can't be read
				console.error(`Error reading file ${file.path}:`, error);
			}
		}

		return null;
	}

	/**
	 * Update settings (called when settings change)
	 */
	updateSettings(settings: YouTubeWhisperSettings): void {
		this.settings = settings;
	}
}
