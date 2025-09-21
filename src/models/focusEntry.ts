import * as vscode from 'vscode';

/**
 * Represents an entry in the Focus Space
 */
export interface FocusEntry {
    /** Unique identifier for the entry */
    id: string;
    
    /** VS Code URI for the file or folder */
    uri: vscode.Uri;
    
    /** Type of the entry */
    type: 'file' | 'folder' | 'section';
    
    /** Custom label for sections, or override for files/folders */
    label?: string;
    
    /** Child entries (only valid for sections) */
    children?: FocusEntry[];
    
    /** Additional metadata */
    metadata?: FocusEntryMetadata;
}

/**
 * Metadata associated with a focus entry
 */
export interface FocusEntryMetadata {
    /** Timestamp when the entry was added */
    dateAdded: number;
    
    /** Relative path from workspace root for display purposes */
    relativePath?: string;
    
    /** Git status if available */
    gitStatus?: string;
    
    /** Order for custom sorting */
    order?: number;
}

/**
 * Serializable version of FocusEntry for JSON persistence
 */
export interface SerializableFocusEntry {
    id: string;
    uriString: string; // URI serialized as string
    type: 'file' | 'folder' | 'section';
    label?: string;
    children?: SerializableFocusEntry[];
    metadata?: FocusEntryMetadata;
}

/**
 * Configuration for Focus Space persistence
 */
export interface FocusSpaceConfig {
    /** Version for migration compatibility */
    version: string;
    
    /** Workspace-specific entries */
    entries: SerializableFocusEntry[];
    
    /** Last modified timestamp */
    lastModified: number;
}