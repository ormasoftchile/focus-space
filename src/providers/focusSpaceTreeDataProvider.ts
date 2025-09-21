import * as vscode from 'vscode';
import { FocusEntry } from '../models/focusEntry';
import { FocusSpaceManager } from '../managers/focusSpaceManager';

/**
 * TreeDataProvider for the Focus Space view in VS Code Explorer
 * Manages the display of focus entries in a hierarchical tree structure
 */
export class FocusSpaceTreeDataProvider implements vscode.TreeDataProvider<FocusEntry> {
    private _onDidChangeTreeData: vscode.EventEmitter<FocusEntry | undefined | null | void> = new vscode.EventEmitter<FocusEntry | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FocusEntry | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private focusSpaceManager: FocusSpaceManager) {
        // Listen for changes in the focus space manager
        this.focusSpaceManager.onDidChange(() => {
            this.refresh();
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

        // Set the resource URI for files and folders
        if (element.type !== 'section') {
            treeItem.resourceUri = element.uri;
        }

        // Set appropriate icons
        treeItem.iconPath = this.getIcon(element);

        // Set context value for context menu
        treeItem.contextValue = element.type;

        // Add command for files to open them
        if (element.type === 'file') {
            treeItem.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [element.uri]
            };
        }

        // Add tooltip with metadata
        if (element.metadata) {
            const dateAdded = new Date(element.metadata.dateAdded).toLocaleDateString();
            treeItem.tooltip = `${element.metadata.relativePath}\nAdded: ${dateAdded}`;
        }

        return treeItem;
    }

    /**
     * Get the children of an element
     */
    getChildren(element?: FocusEntry): Thenable<FocusEntry[]> {
        if (!element) {
            // Root level - get top-level entries
            const entries = this.focusSpaceManager.getTopLevelEntries();
            
            // If no entries, return empty array (empty state will be handled by view)
            return Promise.resolve(entries);
        }

        // Return children for sections
        if (element.type === 'section' && element.children) {
            return Promise.resolve(element.children);
        }

        // Files and folders without children return empty array
        return Promise.resolve([]);
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