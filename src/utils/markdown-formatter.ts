/**
 * Markdown Formatter
 * Formats transcriptions as Obsidian-compatible Markdown
 */

import type { VideoMetadata, TranscriptionResult } from '../types';

/**
 * Format a transcription as Markdown with metadata
 */
export function formatTranscriptionMarkdown(
	transcription: TranscriptionResult,
	metadata: VideoMetadata
): string {
	const lines: string[] = [];

	// Title
	lines.push(`# ${sanitizeMarkdownText(metadata.title)}`);
	lines.push('');

	// YAML frontmatter
	lines.push('---');
	lines.push('source: youtube');
	lines.push(`video_id: ${metadata.videoId}`);
	lines.push(`video_title: "${sanitizeYamlString(metadata.title)}"`);
	lines.push(`video_url: "${metadata.url}"`);
	lines.push(`transcription_method: ${transcription.method}`);
	if (transcription.model) {
		lines.push(`transcription_model: ${transcription.model}`);
	}
	lines.push(`language: ${transcription.language}`);
	lines.push(`duration: ${metadata.duration}`);
	lines.push(`transcribed_date: ${transcription.timestamp}`);
	lines.push('---');
	lines.push('');

	// Metadata section
	lines.push('## Video Information');
	lines.push('');
	lines.push(`**Source:** [${sanitizeMarkdownText(metadata.title)}](${metadata.url})`);
	lines.push(`**Duration:** ${formatDuration(metadata.duration)}`);
	lines.push(`**Language:** ${transcription.language}`);
	lines.push(`**Transcription Method:** ${transcription.method === 'whisper' ? 'OpenAI Whisper' : 'YouTube Captions'}`);
	if (transcription.model) {
		lines.push(`**Model:** ${transcription.model}`);
	}
	lines.push(`**Transcribed:** ${new Date(transcription.timestamp).toLocaleString()}`);
	lines.push('');

	// Transcription content
	lines.push('## Transcription');
	lines.push('');
	lines.push(transcription.text);
	lines.push('');

	return lines.join('\n');
}

/**
 * Format a comparison of two transcriptions
 */
export function formatComparisonMarkdown(
	whisperTranscription: TranscriptionResult,
	youtubeTranscription: TranscriptionResult,
	metadata: VideoMetadata
): string {
	const lines: string[] = [];

	// Title
	lines.push(`# ${sanitizeMarkdownText(metadata.title)} - Comparison`);
	lines.push('');

	// YAML frontmatter
	lines.push('---');
	lines.push('source: youtube');
	lines.push(`video_id: ${metadata.videoId}`);
	lines.push(`video_title: "${sanitizeYamlString(metadata.title)}"`);
	lines.push(`video_url: "${metadata.url}"`);
	lines.push('transcription_method: both');
	lines.push(`language: ${metadata.language}`);
	lines.push(`duration: ${metadata.duration}`);
	lines.push(`transcribed_date: ${whisperTranscription.timestamp}`);
	lines.push('---');
	lines.push('');

	// Metadata section
	lines.push('## Video Information');
	lines.push('');
	lines.push(`**Source:** [${sanitizeMarkdownText(metadata.title)}](${metadata.url})`);
	lines.push(`**Duration:** ${formatDuration(metadata.duration)}`);
	lines.push(`**Language:** ${metadata.language}`);
	lines.push('');

	// Whisper transcription
	lines.push('## Whisper Transcription');
	lines.push('');
	lines.push(`**Model:** ${whisperTranscription.model || 'whisper-1'}`);
	lines.push(`**Word Count:** ${countWords(whisperTranscription.text)}`);
	lines.push('');
	lines.push(whisperTranscription.text);
	lines.push('');

	// Separator
	lines.push('---');
	lines.push('');

	// YouTube transcription
	lines.push('## YouTube Transcription');
	lines.push('');
	lines.push(`**Type:** ${youtubeTranscription.method === 'youtube' ? 'YouTube Captions' : 'Alternative'}`);
	lines.push(`**Word Count:** ${countWords(youtubeTranscription.text)}`);
	lines.push('');
	lines.push(youtubeTranscription.text);
	lines.push('');

	return lines.join('\n');
}

/**
 * Sanitize text for use in Markdown
 */
function sanitizeMarkdownText(text: string): string {
	// Escape special Markdown characters
	return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
}

/**
 * Sanitize text for YAML frontmatter
 */
function sanitizeYamlString(text: string): string {
	// Escape quotes and special characters
	return text.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m ${secs}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${secs}s`;
	} else {
		return `${secs}s`;
	}
}

/**
 * Count words in text
 */
function countWords(text: string): number {
	return text.trim().split(/\s+/).length;
}
