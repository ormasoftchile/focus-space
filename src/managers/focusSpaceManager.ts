import * as vscode from 'vscode';
import * as path from 'path';
import { FocusEntry, SerializableFocusEntry, FocusSpaceConfig } from '../models/focusEntry';
import { TreeOperations } from '../utils/treeOperations';
import { ActiveEditorTracker } from '../utils/activeEditorTracker';
import { configuration } from '../utils/configurationManager';

/**
 * Singleton manager for Focus Space
 * 
 * This class manages the complete lifecycle of Focus Space entries including:
 * - CRUD operations for files, folders, and sections
 * - Hierarchical tree structure management
 * - Persistent storage with debounced saves
 * - Change event notifications for UI updates
 * - Performance optimizations for large trees
 * 
 * Architecture:
 * - Pure hierarchical structure without temp IDs
 * - Real entries only - every displayed item has persistent state
 * - Automatic cache management through TreeOperations
 * - Debounced persistence to minimize disk I/O
 * - Extension lifecycle integration for data safety
 * 
 * Performance Features:
 * - Incremental serialization (only saves when dirty)
 * - Debounced saves to prevent excessive disk writes
 * - Cached tree operations for fast lookups
 * - Batch mode support for multiple operations
 */
export class FocusSpaceManager {
    private static instance: FocusSpaceManager;
    private rootEntries: FocusEntry[] = [];
    private context: vscode.ExtensionContext;
    private storageUri: vscode.Uri | undefined;
    private readonly CONFIG_VERSION = '1.0.0';
    private isDirty: boolean = false;
    private saveTimeout: NodeJS.Timeout | undefined;
    // Save delay is dynamic based on configuration
    private get SAVE_DELAY(): number {
        return configuration.persistenceDebounceMs;
    }
    private activeEditorTracker: ActiveEditorTracker;
    
    // Event emitter for tree data changes
    private _onDidChange: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChange: vscode.Event<void> = this._onDidChange.event;
    
    // Event emitter for active file changes in Focus Space
    private _onDidChangeActiveFile: vscode.EventEmitter<vscode.Uri | undefined> = new vscode.EventEmitter<vscode.Uri | undefined>();
    readonly onDidChangeActiveFile: vscode.Event<vscode.Uri | undefined> = this._onDidChangeActiveFile.event;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.activeEditorTracker = new ActiveEditorTracker();
        this.setupActiveFileTracking();
        this.initializeStorage();
    }

    /**
     * Get or create the singleton instance
     */
    public static getInstance(context?: vscode.ExtensionContext): FocusSpaceManager {
        if (!FocusSpaceManager.instance) {
            if (!context) {
                throw new Error('FocusSpaceManager requires context for initial creation');
            }
            FocusSpaceManager.instance = new FocusSpaceManager(context);
        }
        return FocusSpaceManager.instance;
    }

    /**
     * Initialize storage URI based on workspace
     */
    private initializeStorage(): void {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            this.storageUri = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', 'focus-space.json');
        }
    }

    /**
     * Force immediate save if dirty
     */
    public async saveNow(): Promise<void> {
        if (this.isDirty) {
            await this.persist();
        }
    }

    /**
     * Mark state as dirty and schedule a save
     */
    private markDirtyAndScheduleSave(): void {
        this.isDirty = true;
        
        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // Schedule a debounced save
        this.saveTimeout = setTimeout(() => {
            this.persist();
        }, this.SAVE_DELAY);
    }

    /**
     * Add a new entry to the focus space
     */
    public async addEntry(uri: vscode.Uri, type: 'file' | 'folder' | 'section', parentId?: string, label?: string): Promise<FocusEntry> {
        // Check if the file/folder should be excluded
        if (type !== 'section' && configuration.isExcluded(uri.fsPath)) {
            throw new Error(`File "${vscode.workspace.asRelativePath(uri)}" is excluded by configuration patterns`);
        }

        const id = this.generateId();
        const relativePath = this.getRelativePath(uri);
        
        const entry: FocusEntry = {
            id,
            uri,
            type,
            label,
            children: type === 'section' || type === 'folder' ? [] : undefined,
            metadata: {
                dateAdded: Date.now(),
                relativePath,
                order: TreeOperations.count(this.rootEntries)
            }
        };

        // For folders, eagerly load all contents
        if (type === 'folder') {
            try {
                const folderContents = await vscode.workspace.fs.readDirectory(uri);
                
                // Sort folder contents: directories first, then files, both alphabetically
                const sortedContents = folderContents.sort((a, b) => {
                    const [nameA, typeA] = a;
                    const [nameB, typeB] = b;
                    
                    // Directories first
                    const isDirA = (typeA & vscode.FileType.Directory) !== 0;
                    const isDirB = (typeB & vscode.FileType.Directory) !== 0;
                    
                    if (isDirA && !isDirB) {
                        return -1;
                    }
                    if (!isDirA && isDirB) {
                        return 1;
                    }
                    
                    // Then alphabetically within each type
                    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                });
                
                const children: FocusEntry[] = [];
                
                for (const [name, fileType] of sortedContents) {
                    const childUri = vscode.Uri.joinPath(uri, name);
                    
                    // Skip excluded files/folders
                    if (configuration.isExcluded(childUri.fsPath)) {
                        continue;
                    }
                    
                    const childType = (fileType & vscode.FileType.Directory) ? 'folder' : 'file';
                    
                    // Create child entry directly without adding to root
                    const childEntry: FocusEntry = {
                        id: this.generateId(),
                        uri: childUri,
                        type: childType,
                        label: path.basename(childUri.fsPath),
                        children: childType === 'folder' ? [] : undefined,
                        metadata: {
                            dateAdded: Date.now(),
                            relativePath: this.getRelativePath(childUri),
                            order: children.length
                        }
                    };
                    
                    // For nested folders, recursively load their contents too
                    if (childType === 'folder') {
                        try {
                            const nestedContents = await vscode.workspace.fs.readDirectory(childUri);
                            
                            // Sort nested contents: directories first, then files, both alphabetically
                            const sortedNestedContents = nestedContents.sort((a, b) => {
                                const [nameA, typeA] = a;
                                const [nameB, typeB] = b;
                                
                                // Directories first
                                const isDirA = (typeA & vscode.FileType.Directory) !== 0;
                                const isDirB = (typeB & vscode.FileType.Directory) !== 0;
                                
                                if (isDirA && !isDirB) {
                                    return -1;
                                }
                                if (!isDirA && isDirB) {
                                    return 1;
                                }
                                
                                // Then alphabetically within each type
                                return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                            });
                            
                            const nestedChildren: FocusEntry[] = [];
                            
                            for (const [nestedName, nestedFileType] of sortedNestedContents) {
                                const nestedChildUri = vscode.Uri.joinPath(childUri, nestedName);
                                const nestedChildType = (nestedFileType & vscode.FileType.Directory) ? 'folder' : 'file';
                                
                                const nestedChildEntry: FocusEntry = {
                                    id: this.generateId(),
                                    uri: nestedChildUri,
                                    type: nestedChildType,
                                    label: path.basename(nestedChildUri.fsPath),
                                    children: nestedChildType === 'folder' ? [] : undefined,
                                    metadata: {
                                        dateAdded: Date.now(),
                                        relativePath: this.getRelativePath(nestedChildUri),
                                        order: nestedChildren.length
                                    }
                                };
                                
                                nestedChildren.push(nestedChildEntry);
                            }
                            
                            childEntry.children = nestedChildren;
                        } catch (nestedError) {
                            console.error('Error reading nested folder contents:', nestedError);
                            childEntry.children = [];
                        }
                    }
                    
                    children.push(childEntry);
                }
                
                entry.children = children;
            } catch (error) {
                console.error('Error reading folder contents during eager loading:', error);
                entry.children = []; // Empty array on error
            }
        }

        if (parentId) {
            // Add to specific parent
            const parent = TreeOperations.findById(this.rootEntries, parentId);
            if (parent && (parent.type === 'section' || parent.type === 'folder')) {
                parent.children = parent.children || [];
                parent.children.push(entry);
            } else {
                // Parent not found or not a valid container, add to root
                this.rootEntries.push(entry);
            }
        } else {
            // Add to root level
            this.rootEntries.push(entry);
        }

        this.markDirtyAndScheduleSave();
        this._onDidChange.fire();
        return entry;
    }

    /**
     * Remove an entry from the focus space
     */
    public async removeEntry(id: string): Promise<boolean> {
        // Use TreeOperations for consistent removal
        const removed = TreeOperations.removeById(this.rootEntries, id);
        
        if (removed) {
            this.markDirtyAndScheduleSave();
            this._onDidChange.fire();
        }
        
        return removed;
    }

    /**
     * Get an entry by ID
     */
    public getEntry(id: string): FocusEntry | undefined {
        return TreeOperations.findById(this.rootEntries, id);
    }

    /**
     * Get an entry by URI
     */
    public getEntryByUri(uri: vscode.Uri): FocusEntry | undefined {
        return TreeOperations.findByUri(this.rootEntries, uri);
    }

    /**
     * Get all entries, optionally filtered by parent
     */
    public getEntries(parentId?: string): FocusEntry[] {
        if (parentId) {
            const parent = TreeOperations.findById(this.rootEntries, parentId);
            return parent?.children || [];
        }

        // Return top-level entries
        return TreeOperations.getTopLevelEntries(this.rootEntries);
    }

    /**
     * Get top-level entries (alias for getEntries() with no parent)
     */
    public getTopLevelEntries(): FocusEntry[] {
        return this.getEntries();
    }

    /**
     * Check if an entry exists for a given URI
     */
    public hasEntry(uri: vscode.Uri): boolean {
        return TreeOperations.findByUri(this.rootEntries, uri) !== undefined;
    }

    /**
     * Clear all entries
     */
    public async clearAll(): Promise<void> {
        this.rootEntries = [];
        this.markDirtyAndScheduleSave();
        this._onDidChange.fire();
    }

    /**
     * Create a new section
     */
    public async createSection(name: string): Promise<FocusEntry> {
        const id = this.generateId();
        
        const section: FocusEntry = {
            id,
            uri: vscode.Uri.parse(`focus-section://${id}`),
            type: 'section',
            label: name,
            children: [],
            metadata: {
                dateAdded: Date.now(),
                order: TreeOperations.count(this.rootEntries)
            }
        };

        this.rootEntries.push(section);
        this.markDirtyAndScheduleSave();
        this._onDidChange.fire();
        return section;
    }

    /**
     * Move an entry to a different section
     */
    public async moveToSection(entryId: string, sectionId?: string): Promise<boolean> {
        const moved = TreeOperations.moveEntry(this.rootEntries, entryId, sectionId);
        
        if (moved) {
            this.markDirtyAndScheduleSave();
            this._onDidChange.fire();
        }
        
        return moved;
    }

    /**
     * Reorder an entry within its current parent
     */
    public async reorderEntry(entryId: string, newIndex: number, parentId?: string): Promise<boolean> {
        const reordered = TreeOperations.reorderEntry(this.rootEntries, entryId, newIndex, parentId);
        
        if (reordered) {
            this.markDirtyAndScheduleSave();
            this._onDidChange.fire();
        }
        
        return reordered;
    }

    /**
     * Move an entry to a different section with position control
     */
    public async moveToSectionWithPosition(entryId: string, sectionId?: string, position?: number): Promise<boolean> {
        const moved = TreeOperations.moveEntryWithPosition(this.rootEntries, entryId, sectionId, position);
        
        if (moved) {
            this.markDirtyAndScheduleSave();
            this._onDidChange.fire();
        }
        
        return moved;
    }

    /**
     * Load state from persistence
     */
    public async loadState(): Promise<void> {
        if (!this.storageUri) {
            return;
        }

        try {
            const content = await vscode.workspace.fs.readFile(this.storageUri);
            const text = Buffer.from(content).toString('utf8');
            const config: FocusSpaceConfig = JSON.parse(text);

            this.rootEntries = TreeOperations.fromSerializable(config.entries);
            
            // Build cache for better performance with loaded data
            TreeOperations.buildCache(this.rootEntries);
            
            // Fire change event to update UI
            this._onDidChange.fire();
            
            console.log(`Focus Space: Loaded ${this.rootEntries.length} entries from storage`);
        } catch (error) {
            // File doesn't exist or is corrupt - start fresh
            console.log('Focus Space: Starting with empty state -', error);
            TreeOperations.clearCache();
        }
    }

    /**
     * Persist current state to storage
     */
    private async persist(): Promise<void> {
        if (!this.storageUri || !this.isDirty) {
            return;
        }

        try {
            // Clear timeout if called directly
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = undefined;
            }

            // Ensure .vscode directory exists
            const vscodeDirUri = vscode.Uri.joinPath(this.storageUri, '..');
            await vscode.workspace.fs.createDirectory(vscodeDirUri);

            const config: FocusSpaceConfig = {
                version: this.CONFIG_VERSION,
                entries: this.serializeEntries(),
                lastModified: Date.now()
            };

            const content = JSON.stringify(config, null, 2);
            await vscode.workspace.fs.writeFile(this.storageUri, Buffer.from(content, 'utf8'));
            
            // Mark as clean after successful save
            this.isDirty = false;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save Focus Space: ${error}`);
        }
    }

    /**
     * Serialize entries for JSON storage
     */
    private serializeEntries(): SerializableFocusEntry[] {
        return TreeOperations.toSerializable(this.rootEntries);
    }

    /**
     * Generate a unique ID for entries
     */
    private generateId(): string {
        return `focus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get relative path from workspace root
     */
    private getRelativePath(uri: vscode.Uri): string {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            return path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
        }
        return path.basename(uri.fsPath);
    }

    /**
     * Auto-convert a folder to a section with all its contents
     * This is called when user tries to modify folder children
     */
    public async autoConvertFolderToSection(folderId: string): Promise<{ sectionId: string; childEntries: FocusEntry[] } | null> {
        const folderEntry = TreeOperations.findById(this.rootEntries, folderId);
        if (!folderEntry || folderEntry.type !== 'folder') {
            return null;
        }

        try {
            // Read folder contents
            const folderContents = await vscode.workspace.fs.readDirectory(folderEntry.uri);
            
            // Sort folder contents: directories first, then files, both alphabetically
            const sortedContents = folderContents.sort((a, b) => {
                const [nameA, typeA] = a;
                const [nameB, typeB] = b;
                
                // Directories come before files
                const isDirA = (typeA & vscode.FileType.Directory) !== 0;
                const isDirB = (typeB & vscode.FileType.Directory) !== 0;
                
                if (isDirA && !isDirB) {
                    return -1;
                }
                if (!isDirA && isDirB) {
                    return 1;
                }
                
                // Within same type, sort alphabetically (case-insensitive)
                return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
            });
            
            // Check if this folder is inside a section (to preserve hierarchy)
            const parentEntry = TreeOperations.findParent(this.rootEntries, folderId);
            const parentSectionId = parentEntry?.type === 'section' ? parentEntry.id : undefined;
            
            // Create a section with the folder name
            const folderName = folderEntry.label || folderEntry.uri.fsPath.split('/').pop() || 'Folder';
            const section = await this.createSection(folderName);
            
            // If the original folder was inside a section, move the new section there too
            if (parentSectionId) {
                await this.moveToSection(section.id, parentSectionId);
            }
            
            // Add all folder contents to the section in sorted order
            const childEntries: FocusEntry[] = [];
            for (const [name, fileType] of sortedContents) {
                const childUri = vscode.Uri.joinPath(folderEntry.uri, name);
                const entryType = (fileType & vscode.FileType.Directory) ? 'folder' : 'file';
                
                const childEntry = await this.addEntry(childUri, entryType);
                await this.moveToSection(childEntry.id, section.id);
                childEntries.push(childEntry);
            }

            // Remove the original folder entry
            await this.removeEntry(folderId);
            
            return { sectionId: section.id, childEntries };
        } catch (error) {
            console.error('Failed to auto-convert folder to section:', error);
            return null;
        }
    }

    /**
     * Setup active file tracking to monitor files in Focus Space
     */
    private setupActiveFileTracking(): void {
        this.activeEditorTracker.onDidChangeActiveFile((uri) => {
            // Check if the active file is in Focus Space
            if (uri && this.hasEntry(uri)) {
                this._onDidChangeActiveFile.fire(uri);
            } else {
                this._onDidChangeActiveFile.fire(undefined);
            }
        });
    }

    /**
     * Get the currently active file URI
     */
    public getActiveFileUri(): vscode.Uri | undefined {
        return this.activeEditorTracker.activeFileUri;
    }

    /**
     * Check if a given URI is the currently active file
     */
    public isActiveFile(uri: vscode.Uri): boolean {
        return this.activeEditorTracker.isActiveFile(uri);
    }

    /**
     * Check if a given URI is currently visible in any editor
     */
    public isVisibleFile(uri: vscode.Uri): boolean {
        return this.activeEditorTracker.isVisibleFile(uri);
    }

    /**
     * Get all currently visible file URIs
     */
    public getVisibleFileUris(): vscode.Uri[] {
        return this.activeEditorTracker.getVisibleFileUris();
    }

    /**
     * Check if the currently active file is in Focus Space
     */
    public isActiveFocusFile(): boolean {
        const activeUri = this.getActiveFileUri();
        return activeUri ? this.hasEntry(activeUri) : false;
    }

    /**
     * Manually trigger a refresh of the tree view
     */
    public refresh(): void {
        this._onDidChange.fire();
    }
}