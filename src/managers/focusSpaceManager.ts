import * as vscode from 'vscode';
import * as path from 'path';
import { FocusEntry, SerializableFocusEntry, FocusSpaceConfig, FocusEntryMetadata } from '../models/focusEntry';

/**
 * Singleton manager for Focus Space state and persistence
 */
export class FocusSpaceManager {
    private static instance: FocusSpaceManager;
    private entries: Map<string, FocusEntry> = new Map();
    private context: vscode.ExtensionContext;
    private storageUri: vscode.Uri | undefined;
    private readonly CONFIG_VERSION = '1.0.0';
    
    // Event emitter for tree data changes
    private _onDidChange: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChange: vscode.Event<void> = this._onDidChange.event;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
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
     * Add a new entry to the focus space
     */
    public async addEntry(uri: vscode.Uri, type: 'file' | 'folder' | 'section', parentId?: string, label?: string): Promise<FocusEntry> {
        const id = this.generateId();
        const relativePath = this.getRelativePath(uri);
        
        const entry: FocusEntry = {
            id,
            uri,
            type,
            label,
            children: type === 'section' ? [] : undefined,
            metadata: {
                dateAdded: Date.now(),
                relativePath,
                order: this.entries.size
            }
        };

        this.entries.set(id, entry);

        // If parentId is specified, add to parent's children
        if (parentId && type !== 'section') {
            const parent = this.entries.get(parentId);
            if (parent && parent.type === 'section') {
                parent.children = parent.children || [];
                parent.children.push(entry);
            }
        }

        await this.persist();
        this._onDidChange.fire();
        return entry;
    }

    /**
     * Remove an entry from the focus space
     */
    public async removeEntry(id: string): Promise<boolean> {
        const entry = this.entries.get(id);
        if (!entry) {
            return false;
        }

        // Remove from parent's children if it's a child
        for (const [_, parentEntry] of this.entries) {
            if (parentEntry.children) {
                const index = parentEntry.children.findIndex(child => child.id === id);
                if (index !== -1) {
                    parentEntry.children.splice(index, 1);
                    break;
                }
            }
        }

        // Remove the entry itself
        this.entries.delete(id);
        await this.persist();
        this._onDidChange.fire();
        return true;
    }

    /**
     * Get an entry by ID
     */
    public getEntry(id: string): FocusEntry | undefined {
        return this.entries.get(id);
    }

    /**
     * Get all entries, optionally filtered by parent
     */
    public getEntries(parentId?: string): FocusEntry[] {
        if (parentId) {
            const parent = this.entries.get(parentId);
            return parent?.children || [];
        }

        // Return top-level entries (not in any section)
        return Array.from(this.entries.values()).filter(entry => 
            !this.isChildOfSection(entry)
        );
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
        return Array.from(this.entries.values()).some(entry => 
            entry.uri.toString() === uri.toString()
        );
    }

    /**
     * Clear all entries
     */
    public async clearAll(): Promise<void> {
        this.entries.clear();
        await this.persist();
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
                order: this.entries.size
            }
        };

        this.entries.set(id, section);
        await this.persist();
        return section;
    }

    /**
     * Move an entry to a different section
     */
    public async moveToSection(entryId: string, sectionId?: string): Promise<boolean> {
        const entry = this.entries.get(entryId);
        if (!entry || entry.type === 'section') {
            return false;
        }

        // Remove from current parent
        for (const [_, parentEntry] of this.entries) {
            if (parentEntry.children) {
                const index = parentEntry.children.findIndex(child => child.id === entryId);
                if (index !== -1) {
                    parentEntry.children.splice(index, 1);
                    break;
                }
            }
        }

        // Add to new section if specified
        if (sectionId) {
            const section = this.entries.get(sectionId);
            if (section && section.type === 'section') {
                section.children = section.children || [];
                section.children.push(entry);
            }
        }

        await this.persist();
        return true;
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

            this.entries.clear();
            this.deserializeEntries(config.entries);
        } catch (error) {
            // File doesn't exist or is corrupt - start fresh
            console.log('Focus Space: Starting with empty state');
        }
    }

    /**
     * Persist current state to storage
     */
    private async persist(): Promise<void> {
        if (!this.storageUri) {
            return;
        }

        try {
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
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save Focus Space: ${error}`);
        }
    }

    /**
     * Serialize entries for JSON storage
     */
    private serializeEntries(): SerializableFocusEntry[] {
        const topLevelEntries = this.getEntries();
        return topLevelEntries.map(entry => this.serializeEntry(entry));
    }

    /**
     * Serialize a single entry
     */
    private serializeEntry(entry: FocusEntry): SerializableFocusEntry {
        return {
            id: entry.id,
            uriString: entry.uri.toString(),
            type: entry.type,
            label: entry.label,
            children: entry.children?.map(child => this.serializeEntry(child)),
            metadata: entry.metadata
        };
    }

    /**
     * Deserialize entries from JSON storage
     */
    private deserializeEntries(serializedEntries: SerializableFocusEntry[]): void {
        for (const serialized of serializedEntries) {
            this.deserializeEntry(serialized);
        }
    }

    /**
     * Deserialize a single entry
     */
    private deserializeEntry(serialized: SerializableFocusEntry): FocusEntry {
        const entry: FocusEntry = {
            id: serialized.id,
            uri: vscode.Uri.parse(serialized.uriString),
            type: serialized.type,
            label: serialized.label,
            metadata: serialized.metadata
        };

        if (serialized.children) {
            entry.children = serialized.children.map(child => this.deserializeEntry(child));
        }

        this.entries.set(entry.id, entry);
        return entry;
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
     * Check if an entry is a child of a section
     */
    private isChildOfSection(entry: FocusEntry): boolean {
        for (const [_, parentEntry] of this.entries) {
            if (parentEntry.type === 'section' && parentEntry.children) {
                if (parentEntry.children.some(child => child.id === entry.id)) {
                    return true;
                }
            }
        }
        return false;
    }
}