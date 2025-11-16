/**
 * File Naming Utilities
 * Generate safe, unique filenames for transcriptions
 */

import { App, TFile, normalizePath } from 'obsidian';
import type { TranscriptionMethod } from '../types';

/**
 * Generate a filename from video title
 */
export function generateFilename(
	videoTitle: string,
	method: TranscriptionMethod,
	extension = 'md'
): string {
	// Sanitize the title for use in filename
	let sanitized = sanitizeFilename(videoTitle);

	// Truncate if too long (max 100 characters + method suffix + extension)
	const maxLength = 100;
	if (sanitized.length > maxLength) {
		sanitized = sanitized.substring(0, maxLength).trim();
		// Try to end at a word boundary
		const lastSpace = sanitized.lastIndexOf(' ');
		if (lastSpace > maxLength - 20) {
			sanitized = sanitized.substring(0, lastSpace);
		}
		sanitized += '...';
	}

	// Add method suffix
	let suffix = '';
	switch (method) {
		case 'whisper':
			suffix = '-whisper';
			break;
		case 'youtube':
			suffix = '-youtube';
			break;
		case 'both':
			suffix = '-comparison';
			break;
	}

	return `${sanitized}${suffix}.${extension}`;
}

/**
 * Sanitize filename to be safe on all platforms
 * Removes or replaces characters that are invalid on Windows, macOS, or Linux
 */
export function sanitizeFilename(filename: string): string {
	// Replace or remove invalid characters
	let sanitized = filename
		// Replace path separators
		.replace(/[/\\]/g, '-')
		// Replace invalid Windows characters
		.replace(/[<>:"|?*]/g, '')
		// Replace control characters
		.replace(/[\x00-\x1f\x80-\x9f]/g, '')
		// Replace emoji and other non-ASCII characters (optional - keeping for safety)
		.replace(/[^\x20-\x7E]/g, '')
		// Collapse multiple spaces
		.replace(/\s+/g, ' ')
		// Trim whitespace
		.trim();

	// Remove leading/trailing dots and spaces (Windows issue)
	sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

	// Handle empty result
	if (!sanitized) {
		sanitized = 'Untitled';
	}

	// Ensure it doesn't end with a period (Windows issue)
	if (sanitized.endsWith('.')) {
		sanitized = sanitized.slice(0, -1);
	}

	return sanitized;
}

/**
 * Get a unique filename by appending a number if file exists
 */
export async function getUniqueFilename(
	app: App,
	folderPath: string,
	baseFilename: string
): Promise<string> {
	const normalizedFolder = normalizePath(folderPath);

	// Extract name and extension
	const lastDot = baseFilename.lastIndexOf('.');
	const name = lastDot > 0 ? baseFilename.substring(0, lastDot) : baseFilename;
	const ext = lastDot > 0 ? baseFilename.substring(lastDot) : '';

	// Check if base filename exists
	let fullPath = normalizePath(`${normalizedFolder}/${baseFilename}`);
	let file = app.vault.getAbstractFileByPath(fullPath);

	if (!file) {
		// File doesn't exist, use base filename
		return baseFilename;
	}

	// File exists, try numbered versions
	let counter = 2;
	while (file) {
		const numberedFilename = `${name} ${counter}${ext}`;
		fullPath = normalizePath(`${normalizedFolder}/${numberedFilename}`);
		file = app.vault.getAbstractFileByPath(fullPath);
		counter++;

		// Safety limit to prevent infinite loop
		if (counter > 1000) {
			// Use timestamp as fallback
			const timestamp = Date.now();
			return `${name}-${timestamp}${ext}`;
		}
	}

	// Return the numbered filename
	return `${name} ${counter - 1}${ext}`;
}

/**
 * Ensure a folder exists, creating it if necessary
 */
export async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
	const normalizedPath = normalizePath(folderPath);

	// Check if folder already exists
	const folder = app.vault.getAbstractFileByPath(normalizedPath);
	if (folder) {
		return; // Folder exists
	}

	// Create folder
	await app.vault.createFolder(normalizedPath);
}

/**
 * Get the folder path for the active note
 */
export function getActiveNoteFolder(app: App): string | null {
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) {
		return null;
	}

	const folderPath = activeFile.parent?.path;
	return folderPath || '/';
}

/**
 * Validate that a path is safe and within the vault
 */
export function isValidVaultPath(path: string): boolean {
	const normalized = normalizePath(path);

	// Check for path traversal attempts
	if (normalized.includes('..')) {
		return false;
	}

	// Check for absolute paths (should be relative to vault)
	if (normalized.startsWith('/') && normalized.length > 1) {
		// Root path '/' is okay, but '/absolute/path' is not
		return false;
	}

	return true;
}
