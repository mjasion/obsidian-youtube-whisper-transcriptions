/**
 * Progress Modal
 * Displays transcription progress to the user
 */

import { Modal, App, setIcon } from 'obsidian';

export class ProgressModal extends Modal {
	private progressTitleEl: HTMLElement;
	private messageEl: HTMLElement;
	private progressBarEl: HTMLElement;
	private progressFillEl: HTMLElement;
	private percentageEl: HTMLElement;
	private detailsEl: HTMLElement;
	private cancelButton: HTMLButtonElement | null = null;
	private onCancelCallback: (() => void) | null = null;

	constructor(app: App, title: string) {
		super(app);
		this.createUI(title);
	}

	private createUI(title: string): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('youtube-whisper-progress-modal');

		// Title
		this.progressTitleEl = contentEl.createEl('h2', { text: title });

		// Message
		this.messageEl = contentEl.createEl('p', {
			text: 'Initializing...',
			cls: 'youtube-whisper-progress-message',
		});

		// Progress bar container
		const progressContainer = contentEl.createDiv({
			cls: 'youtube-whisper-progress-bar-container',
		});

		this.progressBarEl = progressContainer.createDiv({
			cls: 'youtube-whisper-progress-bar',
		});

		this.progressFillEl = this.progressBarEl.createDiv({
			cls: 'youtube-whisper-progress-fill',
		});

		this.progressFillEl.style.width = '0%';

		// Percentage
		this.percentageEl = progressContainer.createDiv({
			text: '0%',
			cls: 'youtube-whisper-progress-percentage',
		});

		// Details
		this.detailsEl = contentEl.createDiv({
			cls: 'youtube-whisper-progress-details',
		});
	}

	/**
	 * Update progress
	 */
	updateProgress(percentage: number, message?: string): void {
		const clampedPercentage = Math.max(0, Math.min(100, percentage));

		this.progressFillEl.style.width = `${clampedPercentage}%`;
		this.percentageEl.setText(`${Math.round(clampedPercentage)}%`);

		if (message) {
			this.messageEl.setText(message);
		}
	}

	/**
	 * Update message without changing progress
	 */
	updateMessage(message: string): void {
		this.messageEl.setText(message);
	}

	/**
	 * Add detail line
	 */
	addDetail(detail: string): void {
		const detailLine = this.detailsEl.createDiv({
			text: detail,
			cls: 'youtube-whisper-progress-detail-line',
		});
	}

	/**
	 * Clear details
	 */
	clearDetails(): void {
		this.detailsEl.empty();
	}

	/**
	 * Show cancel button
	 */
	showCancelButton(onCancel: () => void): void {
		if (this.cancelButton) {
			return; // Already showing
		}

		this.onCancelCallback = onCancel;

		this.cancelButton = this.contentEl.createEl('button', {
			text: 'Cancel',
			cls: 'mod-warning youtube-whisper-cancel-button',
		});

		this.cancelButton.addEventListener('click', () => {
			if (this.onCancelCallback) {
				this.onCancelCallback();
			}
		});
	}

	/**
	 * Hide cancel button
	 */
	hideCancelButton(): void {
		if (this.cancelButton) {
			this.cancelButton.remove();
			this.cancelButton = null;
			this.onCancelCallback = null;
		}
	}

	/**
	 * Mark as complete
	 */
	markComplete(message: string): void {
		this.updateProgress(100, message);
		this.hideCancelButton();

		// Add checkmark icon
		const icon = this.progressTitleEl.createSpan({ cls: 'youtube-whisper-complete-icon' });
		setIcon(icon, 'check-circle');
	}

	/**
	 * Mark as error
	 */
	markError(message: string): void {
		this.messageEl.setText(message);
		this.messageEl.addClass('youtube-whisper-error-message');
		this.hideCancelButton();

		// Add error icon
		const icon = this.progressTitleEl.createSpan({ cls: 'youtube-whisper-error-icon' });
		setIcon(icon, 'alert-circle');
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
