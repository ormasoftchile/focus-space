import * as vscode from 'vscode';
import { FocusSpaceManager } from '../managers/focusSpaceManager';
import { configuration } from './configurationManager';

type RevealBehavior = 'smart' | 'focus-space-only' | 'both' | 'disabled';

/**
 * Configuration options for reveal behavior
 */

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
        return configuration.revealBehavior;
    }

    /**
     * Reveal a file in the Focus Space tree view
     */
    public async revealInFocusSpace(uri: vscode.Uri): Promise<boolean> {
        if (!this.treeView) {
            return false;
        }

        try {
            // Find the entry by URI
            const entry = this.focusSpaceManager.getEntryByUri(uri);
            if (!entry) {
                return false;
            }

            // Reveal the entry (tree view should handle refreshing as needed)
            await this.treeView.reveal(entry, { 
                select: true, 
                focus: false, 
                expand: true 
            });
            
            return true;
        } catch (error) {
            // Tree item resolution can fail in various scenarios:
            // - Tree view not fully initialized
            // - Entry not yet rendered in tree
            // - VS Code extension test environment limitations
            // This is common in test environments or when tree items are not yet rendered
            // Reveal failed — tree view not fully initialized or entry not yet rendered
            return false;
        }

        return false;
    }    /**
     * Handle file reveal request based on configuration
     */
    public async handleRevealRequest(uri: vscode.Uri): Promise<void> {
        try {
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
                    try {
                        await vscode.commands.executeCommand('revealInExplorer', uri);
                    } catch {
                        // Explorer reveal not available
                    }
                    break;

                case 'smart':
                default:
                    // Reveal in Focus Space if present, otherwise let Explorer handle it
                    if (isInFocusSpace) {
                        await this.revealInFocusSpace(uri);
                    } else {
                        try {
                            await vscode.commands.executeCommand('revealInExplorer', uri);
                        } catch {
                            // Explorer reveal not available
                        }
                    }
                    break;
            }
        } catch {
            // Don't propagate reveal errors - they're not critical
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