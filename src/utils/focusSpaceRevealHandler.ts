import * as vscode from 'vscode';
import { FocusSpaceManager } from '../managers/focusSpaceManager';

/**
 * Configuration options for reveal behavior
 */
export type RevealBehavior = 'focus-space-only' | 'both' | 'smart';

/**
 * Handles smart reveal behavior for files in Focus Space.
 * Intercepts file reveals and redirects them to Focus Space when appropriate.
 */
export class FocusSpaceRevealHandler {
    private disposables: vscode.Disposable[] = [];
    private focusSpaceManager: FocusSpaceManager;
    private treeView: vscode.TreeView<any> | undefined;

    constructor(focusSpaceManager: FocusSpaceManager) {
        this.focusSpaceManager = focusSpaceManager;
    }

    /**
     * Set the tree view instance to enable revealing
     */
    public setTreeView(treeView: vscode.TreeView<any>): void {
        this.treeView = treeView;
    }

    /**
     * Get the current reveal behavior from configuration
     */
    private getRevealBehavior(): RevealBehavior {
        const config = vscode.workspace.getConfiguration('focusSpace');
        return config.get<RevealBehavior>('revealBehavior', 'smart');
    }

    /**
     * Reveal a file in Focus Space if it exists there
     */
    public async revealInFocusSpace(uri: vscode.Uri): Promise<boolean> {
        if (!this.treeView) {
            return false;
        }

        // Check if file exists in Focus Space
        if (!this.focusSpaceManager.hasEntry(uri)) {
            return false;
        }

        try {
            // Find the entry in Focus Space
            const entry = this.focusSpaceManager.getEntryByUri(uri);
            if (entry) {
                // Reveal the entry in the tree view
                await this.treeView.reveal(entry, {
                    select: true,
                    focus: false,
                    expand: false
                });
                return true;
            }
        } catch (error) {
            console.error('Error revealing file in Focus Space:', error);
        }

        return false;
    }

    /**
     * Handle file reveal request based on configuration
     */
    public async handleRevealRequest(uri: vscode.Uri): Promise<void> {
        const behavior = this.getRevealBehavior();
        const isInFocusSpace = this.focusSpaceManager.hasEntry(uri);

        switch (behavior) {
            case 'focus-space-only':
                if (isInFocusSpace) {
                    await this.revealInFocusSpace(uri);
                }
                // Don't reveal in Explorer at all
                break;

            case 'both':
                if (isInFocusSpace) {
                    await this.revealInFocusSpace(uri);
                }
                // Also reveal in Explorer (let VS Code handle this naturally)
                await vscode.commands.executeCommand('revealInExplorer', uri);
                break;

            case 'smart':
            default:
                // Reveal in Focus Space if present, otherwise let Explorer handle it
                if (isInFocusSpace) {
                    await this.revealInFocusSpace(uri);
                } else {
                    await vscode.commands.executeCommand('revealInExplorer', uri);
                }
                break;
        }
    }

    /**
     * Setup command interception for reveal requests
     */
    public setupRevealInterception(): void {
        // Register a command that can be used instead of revealInExplorer
        this.disposables.push(
            vscode.commands.registerCommand('focusSpace.revealFile', async (uri: vscode.Uri) => {
                await this.handleRevealRequest(uri);
            })
        );

        // Listen for active file changes to potentially reveal them
        this.disposables.push(
            this.focusSpaceManager.onDidChangeActiveFile(async (uri) => {
                if (uri) {
                    const behavior = this.getRevealBehavior();
                    // Only auto-reveal on 'smart' mode and if file is in Focus Space
                    if (behavior === 'smart' && this.focusSpaceManager.hasEntry(uri)) {
                        await this.revealInFocusSpace(uri);
                    }
                }
            })
        );
    }

    /**
     * Dispose of all resources
     */
    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}