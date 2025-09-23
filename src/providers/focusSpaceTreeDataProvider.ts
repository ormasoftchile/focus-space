import * as vscode from 'vscode';
import { FocusEntry } from '../models/focusEntry';
import { FocusSpaceManager } from '../managers/focusSpaceManager';
import { TreeOperations } from '../utils/treeOperations';

/**
 * TreeDataProvider for the Focus Space view in VS Code Explorer
 * 
 * This provider manages the display of focus entries in a hierarchical tree structure
 * within the VS Code Explorer panel. It implements intelligent lazy loading for folder
 * contents and provides rich TreeItem representations with proper icons and actions.
 * 
 * Key Features:
 * - Real-time tree updates via event system
 * - Lazy loading for folder contents with filesystem monitoring
 * - Rich TreeItem metadata (icons, tooltips, context values)
 * - Performance optimized for large folder structures
 * - Automatic real entry creation for folder children
 * 
 * Architecture:
 * - No temp IDs - all displayed items are real entries
 * - Smart caching to prevent duplicate entry creation
 * - Filesystem change detection for folder contents
 * - Proper VS Code TreeDataProvider implementation
 * - Full integration with VS Code's tree UI system
 */
export class FocusSpaceTreeDataProvider implements vscode.TreeDataProvider<FocusEntry> {
    private _onDidChangeTreeData: vscode.EventEmitter<FocusEntry | undefined | null | void> = new vscode.EventEmitter<FocusEntry | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FocusEntry | undefined | null | void> = this._onDidChangeTreeData.event;
    private activeFileUri: vscode.Uri | undefined;

    constructor(private focusSpaceManager: FocusSpaceManager) {
        // Listen for changes in the focus space manager
        this.focusSpaceManager.onDidChange(() => {
            this.refresh();
        });
        
        // Listen for active file changes to update highlighting
        this.focusSpaceManager.onDidChangeActiveFile((uri) => {
            const previousActiveUri = this.activeFileUri;
            this.activeFileUri = uri;
            
            // Refresh the tree if active file changed to/from a Focus Space file
            if (previousActiveUri || uri) {
                this.refresh();
            }
        });
    }

    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get the tree item representation of an element
     */
    getTreeItem(element: FocusEntry): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            element.label || this.getDisplayLabel(element),
            element.type === 'section' ? vscode.TreeItemCollapsibleState.Expanded :
            element.type === 'folder' ? vscode.TreeItemCollapsibleState.Collapsed :
            vscode.TreeItemCollapsibleState.None
        );

        // Set the ID - this is crucial for reveal operations to work
        treeItem.id = element.id;

        // Check if this is the currently active file
        const isActiveFile = this.activeFileUri && 
            element.type !== 'section' && 
            element.uri.toString() === this.activeFileUri.toString();

        // Set the resource URI for files and folders
        if (element.type !== 'section') {
            treeItem.resourceUri = element.uri;
        }

        // Set appropriate icons
        treeItem.iconPath = this.getIcon(element);

        // Set context value for context menu
        treeItem.contextValue = element.type;

        // Store the entry ID in the TreeItem for commands to access
        (treeItem as any).entryId = element.id;

        // Add visual highlighting for active file
        if (isActiveFile) {
            // Add visual indicator for active file - use a different icon or decoration
            treeItem.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('focusSpace.activeFile'));
            
            // Add to description to make it more visible
            const currentDescription = treeItem.description || '';
            treeItem.description = `${currentDescription} ● active`.trim();
            
            // Update tooltip to indicate active status
            if (treeItem.tooltip) {
                treeItem.tooltip = `${treeItem.tooltip}\n● Currently Active`;
            } else {
                treeItem.tooltip = '● Currently Active';
            }
        }

        // Add command for files to open them
        if (element.type === 'file') {
            treeItem.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [element.uri]
            };
        }

        // Add tooltip with metadata (if not already set above)
        if (element.metadata && !isActiveFile) {
            const dateAdded = new Date(element.metadata.dateAdded).toLocaleDateString();
            treeItem.tooltip = `${element.metadata.relativePath}\nAdded: ${dateAdded}`;
        }

        return treeItem;
    }

    /**
     * Get the children of an element
     */
    async getChildren(element?: FocusEntry): Promise<FocusEntry[]> {
        if (!element) {
            // Root level - get top-level entries
            const entries = this.focusSpaceManager.getTopLevelEntries();
            
            // If no entries, return empty array (empty state will be handled by view)
            return entries;
        }

        // Return children for sections and folders (eagerly loaded)
        if ((element.type === 'section' || element.type === 'folder') && element.children) {
            return element.children;
        }

        // Files return empty array (no children)
        return [];
    }

    /**
     * Get the parent of an element (optional, for reveal functionality)
     */
    getParent(element: FocusEntry): vscode.ProviderResult<FocusEntry> {
        // Find the parent by searching through all entries
        const allEntries = this.focusSpaceManager.getTopLevelEntries();
        
        for (const entry of allEntries) {
            if (entry.type === 'section' && entry.children) {
                if (entry.children.some((child: FocusEntry) => child.id === element.id)) {
                    return entry;
                }
            }
        }
        
        return undefined;
    }

    /**
     * Get display label for an entry
     */
    private getDisplayLabel(element: FocusEntry): string {
        if (element.label) {
            return element.label;
        }

        if (element.type === 'section') {
            return 'Untitled Section';
        }

        // Extract filename from URI
        const path = element.uri.fsPath;
        const segments = path.split(/[/\\]/);
        return segments[segments.length - 1] || path;
    }

    /**
     * Get appropriate icon for an entry
     */
    private getIcon(element: FocusEntry): vscode.ThemeIcon {
        switch (element.type) {
            case 'file':
                return vscode.ThemeIcon.File;
            case 'folder':
                return vscode.ThemeIcon.Folder;
            case 'section':
                return new vscode.ThemeIcon('target'); // Focus target icon for sections
            default:
                return vscode.ThemeIcon.File;
        }
    }
}