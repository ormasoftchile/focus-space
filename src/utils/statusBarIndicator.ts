import * as vscode from 'vscode';

/**
 * Manages a status bar indicator showing the Focus Space file count.
 * Hidden when Focus Space is empty. Click reveals the Focus Space panel.
 */
export class StatusBarIndicator implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            'focusSpace.indicator',
            vscode.StatusBarAlignment.Left,
            0
        );
        this.statusBarItem.command = 'focusSpace.revealView';
        this.statusBarItem.tooltip = 'Focus Space — click to reveal';
    }

    /**
     * Update the status bar indicator with the current file count.
     * Shows the item when count > 0, hides when count === 0.
     */
    public update(fileCount: number): void {
        if (fileCount > 0) {
            const label = fileCount === 1 ? '1 file' : `${fileCount} files`;
            this.statusBarItem.text = `$(target) ${label}`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
