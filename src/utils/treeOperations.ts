import * as vscode from 'vscode';
import { FocusEntry, SerializableFocusEntry } from '../models/focusEntry';

/**
 * Utility functions for tree operations on FocusEntry structures
 * 
 * This class provides a comprehensive set of operations for manipulating hierarchical
 * tree structures used in the Focus Space extension. It includes performance optimizations
 * such as caching and batch operations for handling large trees efficiently.
 * 
 * Key Features:
 * - Fast lookups using ID and URI caches
 * - Batch mode for multiple operations
 * - Tree traversal and manipulation methods
 * - Serialization/deserialization support
 * - Performance-optimized for large hierarchies
 * 
 * Architecture Notes:
 * - All entries have real IDs (no temp IDs)
 * - Maintains referential integrity during operations
 * - Cache is automatically invalidated on modifications
 * - Supports arbitrary nesting depth
 */
export class TreeOperations {
    
    // Cache for frequently accessed entries
    private static _idCache = new Map<string, FocusEntry>();
    private static _uriCache = new Map<string, FocusEntry>();
    private static _cacheVersion = 0;
    private static _batchMode = false;
    
    /**
     * Enable batch mode to defer cache clearing until endBatch()
     */
    static startBatch(): void {
        this._batchMode = true;
    }
    
    /**
     * End batch mode and clear cache if needed
     */
    static endBatch(): void {
        this._batchMode = false;
        this.clearCache();
    }
    
    /**
     * Clear all caches (call when tree structure changes)
     */
    static clearCache(): void {
        if (this._batchMode) {
            return; // Defer cache clearing in batch mode
        }
        this._idCache.clear();
        this._uriCache.clear();
        this._cacheVersion++;
    }
    
    /**
     * Build cache from entries array for faster lookups
     */
    static buildCache(entries: FocusEntry[]): void {
        this.clearCache();
        this._buildCacheRecursive(entries);
    }
    
    private static _buildCacheRecursive(entries: FocusEntry[]): void {
        for (const entry of entries) {
            this._idCache.set(entry.id, entry);
            this._uriCache.set(entry.uri.toString(), entry);
            if (entry.children) {
                this._buildCacheRecursive(entry.children);
            }
        }
    }
    
    /**
     * Find an entry by ID in the tree structure (with caching)
     */
    static findById(entries: FocusEntry[], id: string): FocusEntry | undefined {
        // Try cache first
        const cached = this._idCache.get(id);
        if (cached) {
            return cached;
        }
        
        // Fallback to recursive search
        const found = this._findByIdRecursive(entries, id);
        if (found) {
            this._idCache.set(id, found);
        }
        return found;
    }
    
    private static _findByIdRecursive(entries: FocusEntry[], id: string): FocusEntry | undefined {
        for (const entry of entries) {
            if (entry.id === id) {
                return entry;
            }
            if (entry.children) {
                const found = this._findByIdRecursive(entry.children, id);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    /**
     * Find an entry by URI in the tree structure (with caching)
     */
    static findByUri(entries: FocusEntry[], uri: vscode.Uri): FocusEntry | undefined {
        const uriString = uri.toString();
        
        // Try cache first
        const cached = this._uriCache.get(uriString);
        if (cached) {
            return cached;
        }
        
        // Fallback to recursive search
        const found = this._findByUriRecursive(entries, uri);
        if (found) {
            this._uriCache.set(uriString, found);
        }
        return found;
    }
    
    private static _findByUriRecursive(entries: FocusEntry[], uri: vscode.Uri): FocusEntry | undefined {
        for (const entry of entries) {
            if (entry.uri.toString() === uri.toString()) {
                return entry;
            }
            if (entry.children) {
                const found = this._findByUriRecursive(entry.children, uri);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    /**
     * Find the parent of an entry by the child's ID
     */
    static findParent(entries: FocusEntry[], childId: string): FocusEntry | undefined {
        for (const entry of entries) {
            if (entry.children) {
                // Check if this entry is the direct parent
                if (entry.children.some(child => child.id === childId)) {
                    return entry;
                }
                // Recursively search in children
                const found = this.findParent(entry.children, childId);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    /**
     * Add a child entry to a parent entry
     */
    static addChild(parent: FocusEntry, child: FocusEntry): void {
        if (!parent.children) {
            parent.children = [];
        }
        parent.children.push(child);
        this.clearCache(); // Clear cache after modification
    }

    /**
     * Remove an entry from the tree structure by ID
     * Returns true if the entry was found and removed
     */
    static removeById(entries: FocusEntry[], id: string): boolean {
        for (let i = 0; i < entries.length; i++) {
            if (entries[i].id === id) {
                entries.splice(i, 1);
                this.clearCache(); // Clear cache after modification
                return true;
            }
            if (entries[i].children && entries[i].children!.length > 0) {
                const removed = this.removeById(entries[i].children!, id);
                if (removed) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Remove a child entry from a parent entry
     */
    static removeChild(parent: FocusEntry, childId: string): boolean {
        if (!parent.children) {
            return false;
        }
        const index = parent.children.findIndex(child => child.id === childId);
        if (index >= 0) {
            parent.children.splice(index, 1);
            this.clearCache(); // Clear cache after modification
            return true;
        }
        return false;
    }

    /**
     * Move an entry from one parent to another
     */
    static moveEntry(entries: FocusEntry[], entryId: string, newParentId?: string): boolean {
        // Find the entry to move
        const entry = this.findById(entries, entryId);
        if (!entry) {
            return false;
        }

        // Remove from current location
        const removed = this.removeById(entries, entryId);
        if (!removed) {
            return false;
        }

        // Add to new location
        if (newParentId) {
            const newParent = this.findById(entries, newParentId);
            if (!newParent) {
                return false;
            }
            this.addChild(newParent, entry);
        } else {
            // Add to root level
            entries.push(entry);
            this.clearCache(); // Clear cache after modification
        }

        return true;
    }

    /**
     * Get all top-level entries (entries without parents)
     */
    static getTopLevelEntries(entries: FocusEntry[]): FocusEntry[] {
        return entries.slice(); // Return a copy of the root level entries
    }

    /**
     * Flatten the tree structure into a flat array
     * Useful for serialization and bulk operations
     */
    static flatten(entries: FocusEntry[]): FocusEntry[] {
        const result: FocusEntry[] = [];
        
        function visit(entry: FocusEntry) {
            result.push(entry);
            if (entry.children) {
                entry.children.forEach(visit);
            }
        }

        entries.forEach(visit);
        return result;
    }

    /**
     * Get all entries of a specific type
     */
    static getEntriesByType(entries: FocusEntry[], type: 'file' | 'folder' | 'section'): FocusEntry[] {
        const result: FocusEntry[] = [];
        
        function visit(entry: FocusEntry) {
            if (entry.type === type) {
                result.push(entry);
            }
            if (entry.children) {
                entry.children.forEach(visit);
            }
        }

        entries.forEach(visit);
        return result;
    }

    /**
     * Convert FocusEntry tree to SerializableFocusEntry tree
     */
    static toSerializable(entries: FocusEntry[]): SerializableFocusEntry[] {
        return entries.map(entry => ({
            id: entry.id,
            uriString: entry.uri.toString(),
            type: entry.type,
            label: entry.label,
            isExpanded: entry.isExpanded,
            children: entry.children ? this.toSerializable(entry.children) : undefined,
            metadata: entry.metadata
        }));
    }

    /**
     * Convert SerializableFocusEntry tree to FocusEntry tree
     */
    static fromSerializable(serializableEntries: SerializableFocusEntry[]): FocusEntry[] {
        return serializableEntries.map(entry => ({
            id: entry.id,
            uri: vscode.Uri.parse(entry.uriString),
            type: entry.type,
            label: entry.label,
            isExpanded: entry.isExpanded,
            children: entry.children ? this.fromSerializable(entry.children) : undefined,
            metadata: entry.metadata
        }));
    }

    /**
     * Get the depth of an entry in the tree (0 for root level)
     */
    static getDepth(entries: FocusEntry[], entryId: string): number {
        function findDepth(currentEntries: FocusEntry[], currentDepth: number): number {
            for (const entry of currentEntries) {
                if (entry.id === entryId) {
                    return currentDepth;
                }
                if (entry.children) {
                    const found = findDepth(entry.children, currentDepth + 1);
                    if (found >= 0) {
                        return found;
                    }
                }
            }
            return -1; // Not found
        }

        return findDepth(entries, 0);
    }

    /**
     * Get the path from root to a specific entry
     */
    static getPath(entries: FocusEntry[], entryId: string): FocusEntry[] {
        function findPath(currentEntries: FocusEntry[], path: FocusEntry[]): FocusEntry[] | null {
            for (const entry of currentEntries) {
                const currentPath = [...path, entry];
                
                if (entry.id === entryId) {
                    return currentPath;
                }
                
                if (entry.children) {
                    const found = findPath(entry.children, currentPath);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        }

        const path = findPath(entries, []);
        return path || [];
    }

    /**
     * Check if an entry exists in the tree
     */
    static exists(entries: FocusEntry[], id: string): boolean {
        return this.findById(entries, id) !== undefined;
    }

    /**
     * Count total number of entries in the tree
     */
    static count(entries: FocusEntry[]): number {
        return this.flatten(entries).length;
    }

    /**
     * Check if a folder entry has been loaded (has children array populated)
     */
    static isFolderLoaded(entry: FocusEntry): boolean {
        return entry.type === 'folder' && Array.isArray(entry.children);
    }

    /**
     * Mark a folder as loaded by ensuring it has a children array
     */
    static markFolderAsLoaded(entry: FocusEntry): void {
        if (entry.type === 'folder') {
            entry.children = entry.children || [];
        }
    }

    /**
     * Get children URIs for a folder (for comparison with filesystem)
     */
    static getFolderChildrenUris(entry: FocusEntry): Set<string> {
        const uris = new Set<string>();
        if (entry.type === 'folder' && entry.children) {
            for (const child of entry.children) {
                uris.add(child.uri.toString());
            }
        }
        return uris;
    }

    /**
     * Clear all children from an entry
     */
    static clearChildren(entry: FocusEntry): void {
        entry.children = undefined;
        entry.isExpanded = false;
    }

    /**
     * Reorder an entry within its current parent to a new position
     */
    static reorderEntry(entries: FocusEntry[], entryId: string, newIndex: number, parentId?: string): boolean {
        const targetArray = parentId ? 
            this.findById(entries, parentId)?.children : 
            entries;
        
        if (!targetArray) {
            return false;
        }

        // Find current index of the entry
        const currentIndex = targetArray.findIndex(entry => entry.id === entryId);
        if (currentIndex === -1) {
            return false;
        }

        // Remove the entry from current position
        const [movedEntry] = targetArray.splice(currentIndex, 1);
        
        // Insert at new position (clamp to valid range)
        const clampedIndex = Math.max(0, Math.min(newIndex, targetArray.length));
        targetArray.splice(clampedIndex, 0, movedEntry);
        
        this.clearCache(); // Clear cache after modification
        return true;
    }

    /**
     * Move an entry with position control
     */
    static moveEntryWithPosition(
        entries: FocusEntry[], 
        entryId: string, 
        newParentId?: string, 
        position?: number
    ): boolean {
        // Find the entry to move
        const entry = this.findById(entries, entryId);
        if (!entry) {
            return false;
        }

        // Remove from current location
        const removed = this.removeById(entries, entryId);
        if (!removed) {
            return false;
        }

        // Add to new location at specific position
        if (newParentId) {
            const newParent = this.findById(entries, newParentId);
            if (!newParent) {
                return false;
            }
            if (!newParent.children) {
                newParent.children = [];
            }
            
            if (position !== undefined) {
                const clampedPosition = Math.max(0, Math.min(position, newParent.children.length));
                newParent.children.splice(clampedPosition, 0, entry);
            } else {
                newParent.children.push(entry);
            }
        } else {
            // Add to root level at specific position
            if (position !== undefined) {
                const clampedPosition = Math.max(0, Math.min(position, entries.length));
                entries.splice(clampedPosition, 0, entry);
            } else {
                entries.push(entry);
            }
        }

        this.clearCache(); // Clear cache after modification
        return true;
    }
}