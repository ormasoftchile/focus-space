/**
 * Focus Space Configuration Schema Design
 * 
 * This document outlines all configuration settings for the Focus Space extension,
 * organized by category with detailed descriptions and validation rules.
 */

// =============================================================================
// APPEARANCE SETTINGS
// =============================================================================

interface AppearanceSettings {
  // View visibility and presentation
  hideWhenEmpty: boolean; // Default: true - Hide view when no items
  showItemCount: boolean; // Default: true - Show count in view title
  showFileIcons: boolean; // Default: true - Use file type icons
  showRelativePaths: boolean; // Default: false - Show relative paths as tooltips
  
  // Tree display options
  compactFolders: boolean; // Default: true - Collapse single-child folders
  sortOrder: 'name' | 'dateAdded' | 'fileType' | 'manual'; // Default: 'manual'
  groupByType: boolean; // Default: false - Group files by type
  
  // Visual indicators
  highlightActiveFile: boolean; // Default: true - Highlight active editor file
  showBreadcrumbs: boolean; // Default: false - Show breadcrumb path
}

// =============================================================================
// BEHAVIOR SETTINGS
// =============================================================================

interface BehaviorSettings {
  // File revelation behavior
  revealBehavior: 'smart' | 'focus-space-only' | 'both' | 'disabled'; // Default: 'smart'
  autoRevealActiveFile: boolean; // Default: true - Auto-reveal active file
  
  // Drag and drop
  enableDragAndDrop: boolean; // Default: true - Allow reordering
  allowExternalDrop: boolean; // Default: true - Accept external files
  confirmBeforeDrop: boolean; // Default: false - Confirm external drops
  
  // File operations
  addFilesRecursively: boolean; // Default: false - Add folder contents automatically
  excludePatterns: string[]; // Default: [] - Glob patterns to exclude
  includePatterns: string[]; // Default: [] - Glob patterns to include
  followSymlinks: boolean; // Default: false - Follow symbolic links
  
  // Auto-management
  removeDeletedFiles: boolean; // Default: true - Auto-remove deleted files
  updateMovedFiles: boolean; // Default: true - Auto-update moved files
  removeEmptyFolders: boolean; // Default: true - Remove empty folder entries
}

// =============================================================================
// PERFORMANCE SETTINGS
// =============================================================================

interface PerformanceSettings {
  // File system watching
  enableFileWatcher: boolean; // Default: true - Monitor file changes
  watcherDebounceMs: number; // Default: 100 - Debounce file events
  
  // Large file handling
  maxFileSize: number; // Default: 10MB - Warn for large files
  maxItemCount: number; // Default: 1000 - Warn for many items
  virtualScrolling: boolean; // Default: true - Use virtual scrolling
  
  // Background operations
  eagerLoadFolders: boolean; // Default: true - Load folder contents eagerly
  cacheEntryMetadata: boolean; // Default: true - Cache file metadata
  persistenceDebounceMs: number; // Default: 500 - Debounce save operations
}

// =============================================================================
// WORKFLOW SETTINGS
// =============================================================================

interface WorkflowSettings {
  // Default actions
  defaultSectionName: string; // Default: 'New Section' - Template for sections
  autoExpandSections: boolean; // Default: true - Expand new sections
  doubleClickBehavior: 'open' | 'reveal' | 'both'; // Default: 'open'
  
  // Keyboard shortcuts
  enableKeyboardShortcuts: boolean; // Default: true - Enable all shortcuts
  customKeyBindings: Record<string, string>; // Default: {} - Custom key mappings
  
  // Integration
  showInExplorerContext: boolean; // Default: true - Show in context menus
  showInEditorTitle: boolean; // Default: true - Show in editor title
  enableCopilotIntegration: boolean; // Default: true - Show Copilot commands
}

// =============================================================================
// WORKSPACE SETTINGS
// =============================================================================

interface WorkspaceSettings {
  // Per-workspace configuration
  workspaceSpecificSettings: boolean; // Default: true - Allow workspace overrides
  shareConfigAcrossWorkspaces: boolean; // Default: false - Sync across workspaces
  
  // Storage and persistence
  persistenceLocation: 'workspace' | 'global' | 'both'; // Default: 'workspace'
  autoSaveEnabled: boolean; // Default: true - Auto-save changes
  backupEnabled: boolean; // Default: true - Keep backups
  
  // Import/Export
  allowConfigImport: boolean; // Default: true - Allow importing configurations
  allowConfigExport: boolean; // Default: true - Allow exporting configurations
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

interface ValidationRules {
  maxFileSize: { min: 1, max: 100 }; // 1MB to 100MB
  maxItemCount: { min: 10, max: 10000 }; // 10 to 10,000 items
  watcherDebounceMs: { min: 50, max: 5000 }; // 50ms to 5s
  persistenceDebounceMs: { min: 100, max: 10000 }; // 100ms to 10s
  sortOrder: ['name', 'dateAdded', 'fileType', 'manual'];
  revealBehavior: ['smart', 'focus-space-only', 'both', 'disabled'];
  doubleClickBehavior: ['open', 'reveal', 'both'];
  persistenceLocation: ['workspace', 'global', 'both'];
}

// =============================================================================
// MIGRATION STRATEGY
// =============================================================================

interface MigrationInfo {
  // Version 0.1.0 -> 0.2.0
  addedSettings: string[]; // New settings to initialize with defaults
  removedSettings: string[]; // Deprecated settings to clean up
  renamedSettings: Record<string, string>; // Old name -> new name mapping
  
  // Breaking changes
  breakingChanges: {
    setting: string;
    oldType: string;
    newType: string;
    migrationFn: (oldValue: any) => any;
  }[];
}

export {
  AppearanceSettings,
  BehaviorSettings,
  PerformanceSettings,
  WorkflowSettings,
  WorkspaceSettings,
  ValidationRules,
  MigrationInfo
};