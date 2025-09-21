import * as vscode from 'vscode';
import { FocusSpaceManager } from '../managers/focusSpaceManager';
import { FocusEntry } from '../models/focusEntry';
import { configuration } from './configurationManager';

/**
 * File System Watcher for Focus Space entries
 * Monitors focused files and folders for external changes
 */
export class FileSystemWatcher {
    private static instance: FileSystemWatcher | undefined;
    private watchers: vscode.FileSystemWatcher[] = [];
    private manager: FocusSpaceManager;
    private disposables: vscode.Disposable[] = [];

    private constructor(manager: FocusSpaceManager) {
        this.manager = manager;
        
        // Only setup watchers if file watching is enabled
        if (configuration.enableFileWatcher) {
            this.setupWatchers();
        }
        
        // Listen for changes to Focus Space to update watchers
        this.disposables.push(
            this.manager.onDidChange(() => {
                if (configuration.enableFileWatcher) {
                    this.updateWatchers();
                }
            })
        );

        // Listen for VS Code's built-in file rename events (always enabled for better UX)
        this.disposables.push(
            vscode.workspace.onDidRenameFiles(e => this.handleRenameFiles(e))
        );

        // Listen for VS Code's built-in file delete events (always enabled for better UX)
        this.disposables.push(
            vscode.workspace.onDidDeleteFiles(e => this.handleDeleteFiles(e))
        );

        // Listen for workspace folder changes
        this.disposables.push(
            vscode.workspace.onDidChangeWorkspaceFolders(e => this.handleWorkspaceFoldersChange(e))
        );

        // Listen for configuration changes to enable/disable watchers
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('focusSpace.enableFileWatcher')) {
                    if (configuration.enableFileWatcher) {
                        this.setupWatchers();
                    } else {
                        this.disposeWatchers();
                    }
                }
            })
        );
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(manager?: FocusSpaceManager): FileSystemWatcher {
        if (!FileSystemWatcher.instance) {
            if (!manager) {
                throw new Error('Manager required for first initialization');
            }
            FileSystemWatcher.instance = new FileSystemWatcher(manager);
        }
        return FileSystemWatcher.instance;
    }

    /**
     * Set up initial file system watchers
     */
    private setupWatchers(): void {
        this.updateWatchers();
    }

    /**
     * Update watchers based on current Focus Space entries
     */
    private updateWatchers(): void {
        // Dispose existing watchers
        this.disposeWatchers();

        // Get all focused entries
        const entries = this.getAllEntries();
        const uniquePaths = new Set<string>();

        // Collect all paths to watch
        for (const entry of entries) {
            if (entry.type !== 'section') {
                uniquePaths.add(entry.uri.fsPath);
                
                // For folders, watch the parent directory to catch renames
                if (entry.type === 'folder') {
                    const parentPath = vscode.Uri.joinPath(entry.uri, '..').fsPath;
                    uniquePaths.add(parentPath);
                }
            }
        }

        // Create watchers for each unique path
        for (const path of uniquePaths) {
            this.createWatcherForPath(path);
        }

        // Watch workspace folders for broader changes
        this.createWorkspaceWatchers();
    }

    /**
     * Get all entries from Focus Space (flattened)
     */
    private getAllEntries(): FocusEntry[] {
        const topLevel = this.manager.getTopLevelEntries();
        const allEntries: FocusEntry[] = [];

        const collectEntries = (entries: FocusEntry[]) => {
            for (const entry of entries) {
                allEntries.push(entry);
                if (entry.children) {
                    collectEntries(entry.children);
                }
            }
        };

        collectEntries(topLevel);
        return allEntries;
    }

    /**
     * Create a watcher for a specific path
     */
    private createWatcherForPath(path: string): void {
        try {
            const pattern = new vscode.RelativePattern(path, '*');
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            // Handle file/folder creation
            watcher.onDidCreate(uri => this.handleFileCreate(uri));
            
            // Handle file/folder changes
            watcher.onDidChange(uri => this.handleFileChange(uri));
            
            // Handle file/folder deletion
            watcher.onDidDelete(uri => this.handleFileDelete(uri));

            this.watchers.push(watcher);
            this.disposables.push(watcher);
        } catch (error) {
            console.warn(`Failed to create watcher for path: ${path}`, error);
        }
    }

    /**
     * Create watchers for workspace folders
     */
    private createWorkspaceWatchers(): void {
        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        for (const folder of vscode.workspace.workspaceFolders) {
            try {
                // Watch for general file operations in workspace
                const pattern = new vscode.RelativePattern(folder, '**/*');
                const watcher = vscode.workspace.createFileSystemWatcher(pattern);

                watcher.onDidCreate(uri => this.handleWorkspaceFileCreate(uri));
                watcher.onDidDelete(uri => this.handleWorkspaceFileDelete(uri));

                this.watchers.push(watcher);
                this.disposables.push(watcher);
            } catch (error) {
                console.warn(`Failed to create workspace watcher for: ${folder.uri.fsPath}`, error);
            }
        }
    }

    /**
     * Handle workspace folder changes
     */
    private async handleWorkspaceFoldersChange(event: vscode.WorkspaceFoldersChangeEvent): Promise<void> {
        console.log('Workspace folders changed');
        
        // When workspace folders are removed, check if any focused entries become invalid
        for (const removedFolder of event.removed) {
            await this.handleRemovedWorkspaceFolder(removedFolder);
        }
        
        // When workspace folders are added, update watchers to include new paths
        if (event.added.length > 0) {
            this.updateWatchers();
        }
    }

    /**
     * Handle a removed workspace folder
     */
    private async handleRemovedWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<void> {
        const entries = this.getAllEntries();
        const affectedEntries: FocusEntry[] = [];
        
        // Find entries that were in the removed folder
        for (const entry of entries) {
            if (entry.type !== 'section') {
                const entryPath = entry.uri.fsPath;
                const folderPath = folder.uri.fsPath;
                
                if (entryPath.startsWith(folderPath)) {
                    affectedEntries.push(entry);
                }
            }
        }
        
        if (affectedEntries.length > 0) {
            const action = await vscode.window.showWarningMessage(
                `Focus Space: Workspace folder "${folder.name}" was removed. ${affectedEntries.length} focused items are no longer accessible. Remove them from Focus Space?`,
                'Remove All',
                'Keep All',
                'Review Each'
            );
            
            if (action === 'Remove All') {
                for (const entry of affectedEntries) {
                    await this.manager.removeEntry(entry.id);
                }
                vscode.window.showInformationMessage(`Removed ${affectedEntries.length} items from Focus Space`);
            } else if (action === 'Review Each') {
                for (const entry of affectedEntries) {
                    const relativePath = vscode.workspace.asRelativePath(entry.uri);
                    const entryAction = await vscode.window.showWarningMessage(
                        `Focus Space: "${entry.label || relativePath}" is no longer accessible. Remove from Focus Space?`,
                        'Remove',
                        'Keep'
                    );
                    
                    if (entryAction === 'Remove') {
                        await this.manager.removeEntry(entry.id);
                    }
                }
            }
        }
    }

    /**
     * Handle VS Code's built-in file rename events
     */
    private async handleRenameFiles(event: vscode.FileRenameEvent): Promise<void> {
        for (const rename of event.files) {
            const entry = this.findEntryByUri(rename.oldUri);
            if (entry) {
                console.log(`File renamed: ${rename.oldUri.fsPath} -> ${rename.newUri.fsPath}`);
                await this.updateEntryUri(entry, rename.newUri);
                
                const relativePath = vscode.workspace.asRelativePath(rename.newUri);
                vscode.window.showInformationMessage(
                    `Focus Space: Updated "${entry.label || relativePath}" to new location`
                );
            }
        }
    }

    /**
     * Handle VS Code's built-in file delete events
     */
    private async handleDeleteFiles(event: vscode.FileDeleteEvent): Promise<void> {
        for (const uri of event.files) {
            const entry = this.findEntryByUri(uri);
            if (entry) {
                console.log(`File deleted via VS Code: ${uri.fsPath}`);
                await this.handleDeletedEntry(entry, uri);
            }
        }
    }

    /**
     * Handle file creation
     */
    private handleFileCreate(uri: vscode.Uri): void {
        console.log('File created:', uri.fsPath);
        // Generally, we don't auto-add created files to Focus Space
        // Users should explicitly add them if needed
    }

    /**
     * Handle file changes
     */
    private handleFileChange(uri: vscode.Uri): void {
        console.log('File changed:', uri.fsPath);
        // File content changes don't affect Focus Space structure
        // No action needed
    }

    /**
     * Handle file deletion
     */
    private async handleFileDelete(uri: vscode.Uri): Promise<void> {
        console.log('File deleted:', uri.fsPath);
        
        const entry = this.findEntryByUri(uri);
        if (entry) {
            await this.handleDeletedEntry(entry, uri);
        }
    }

    /**
     * Handle workspace file creation (broader scope)
     */
    private handleWorkspaceFileCreate(uri: vscode.Uri): void {
        // Check if this affects any focused entries (e.g., file moved/renamed)
        this.checkForFileMove(uri);
    }

    /**
     * Handle workspace file deletion (broader scope)
     */
    private async handleWorkspaceFileDelete(uri: vscode.Uri): Promise<void> {
        const entry = this.findEntryByUri(uri);
        if (entry) {
            await this.handleDeletedEntry(entry, uri);
        }
    }

    /**
     * Check if a newly created file might be a moved/renamed focused file
     */
    private checkForFileMove(newUri: vscode.Uri): void {
        // This is a simplified approach - in practice, VS Code's workspace.onDidRenameFiles
        // would be better for handling renames, but this provides fallback detection
        const newPath = newUri.fsPath;
        const newBasename = vscode.Uri.joinPath(newUri, '..').fsPath;

        // Check if any focused entries might have been moved here
        const entries = this.getAllEntries();
        for (const entry of entries) {
            if (entry.type !== 'section') {
                const entryBasename = vscode.workspace.asRelativePath(entry.uri);
                const newRelative = vscode.workspace.asRelativePath(newUri);
                
                // If the relative path basename matches, it might be a move
                if (entryBasename.split('/').pop() === newRelative.split('/').pop()) {
                    this.handlePossibleFileMove(entry, newUri);
                }
            }
        }
    }

    /**
     * Handle a possible file move/rename
     */
    private async handlePossibleFileMove(entry: FocusEntry, newUri: vscode.Uri): Promise<void> {
        // Check if file move/rename tracking is enabled
        if (!configuration.updateMovedFiles) {
            return;
        }

        try {
            // Check if the old file no longer exists
            const oldExists = await this.fileExists(entry.uri);
            const newExists = await this.fileExists(newUri);

            if (!oldExists && newExists) {
                // Likely a move/rename - update the entry
                await this.updateEntryUri(entry, newUri);
                
                vscode.window.showInformationMessage(
                    `Focus Space: Updated "${entry.label || vscode.workspace.asRelativePath(entry.uri)}" to new location`
                );
            }
        } catch (error) {
            console.warn('Error checking file move:', error);
        }
    }

    /**
     * Check if a file exists
     */
    private async fileExists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Update an entry's URI
     */
    private async updateEntryUri(entry: FocusEntry, newUri: vscode.Uri): Promise<void> {
        // Update the entry's URI
        entry.uri = newUri;
        
        // Update metadata if present
        if (entry.metadata) {
            entry.metadata.relativePath = vscode.workspace.asRelativePath(newUri);
        }

        // Trigger a save and refresh
        await this.manager.saveNow();
        this.manager.refresh();
    }

    /**
     * Find entry by URI
     */
    private findEntryByUri(uri: vscode.Uri): FocusEntry | undefined {
        const entries = this.getAllEntries();
        return entries.find(entry => 
            entry.type !== 'section' && 
            entry.uri.fsPath === uri.fsPath
        );
    }

    /**
     * Handle a deleted entry
     */
    private async handleDeletedEntry(entry: FocusEntry, uri: vscode.Uri): Promise<void> {
        const relativePath = vscode.workspace.asRelativePath(uri);
        const displayName = entry.label || relativePath;

        // Check if automatic removal is enabled
        if (configuration.removeDeletedFiles) {
            await this.manager.removeEntry(entry.id);
            vscode.window.showInformationMessage(`Removed "${displayName}" from Focus Space (file was deleted)`);
            return;
        }

        // Show notification with option to remove or keep
        const action = await vscode.window.showWarningMessage(
            `Focus Space: "${displayName}" has been deleted. Remove from Focus Space?`,
            'Remove',
            'Keep'
        );

        if (action === 'Remove') {
            await this.manager.removeEntry(entry.id);
            vscode.window.showInformationMessage(`Removed "${displayName}" from Focus Space`);
        } else if (action === 'Keep') {
            vscode.window.showInformationMessage(
                `Keeping "${displayName}" in Focus Space (file may no longer exist)`
            );
        }
    }

    /**
     * Dispose all watchers
     */
    private disposeWatchers(): void {
        for (const watcher of this.watchers) {
            watcher.dispose();
        }
        this.watchers = [];
    }

    /**
     * Dispose the file system watcher
     */
    public dispose(): void {
        this.disposeWatchers();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
        FileSystemWatcher.instance = undefined;
    }
}