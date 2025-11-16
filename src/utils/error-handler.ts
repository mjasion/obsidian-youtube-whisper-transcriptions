/**
 * Error Handler
 * Centralized error handling with user-friendly messages
 */

import { Notice } from 'obsidian';
import type { TranscriptionError } from '../types';

/**
 * Create a user-friendly error from an exception
 */
export function createError(
	category: TranscriptionError['category'],
	error: Error | unknown,
	context?: string
): TranscriptionError {
	const errorMessage = error instanceof Error ? error.message : String(error);

	let userMessage: string;
	let detail: string;

	switch (category) {
		case 'config':
			userMessage = `Configuration error: ${errorMessage}`;
			detail = `Config error in ${context || 'unknown context'}: ${errorMessage}`;
			break;

		case 'network':
			userMessage = `Network error: ${errorMessage}. Please check your connection and try again.`;
			detail = `Network error during ${context || 'unknown operation'}: ${errorMessage}`;
			break;

		case 'api':
			userMessage = `API error: ${errorMessage}`;
			detail = `API error from ${context || 'unknown service'}: ${errorMessage}`;
			break;

		case 'filesystem':
			userMessage = `File system error: ${errorMessage}`;
			detail = `Filesystem error during ${context || 'unknown operation'}: ${errorMessage}`;
			break;

		case 'processing':
			userMessage = `Processing error: ${errorMessage}`;
			detail = `Processing error in ${context || 'unknown step'}: ${errorMessage}`;
			break;

		default:
			userMessage = `Error: ${errorMessage}`;
			detail = `Error in ${context || 'unknown context'}: ${errorMessage}`;
	}

	return {
		category,
		message: userMessage,
		detail,
	};
}

/**
 * Display error to user and log details
 */
export function handleError(error: TranscriptionError): void {
	// Show user-friendly message
	new Notice(error.message, 10000);

	// Log technical details to console
	console.error(`[YouTube Whisper] ${error.detail}`);

	// Execute action if provided
	if (error.action) {
		// Could show a button in the notice, but Obsidian API doesn't support that directly
		// For now, just log the action
		console.log(`Suggested action: ${error.action.label}`);
	}
}

/**
 * Show error notice with custom duration
 */
export function showError(message: string, duration = 5000): void {
	new Notice(message, duration);
}

/**
 * Show success notice
 */
export function showSuccess(message: string, duration = 3000): void {
	new Notice(message, duration);
}

/**
 * Show info notice
 */
export function showInfo(message: string, duration = 4000): void {
	new Notice(message, duration);
}
