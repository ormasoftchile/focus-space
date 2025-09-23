import * as vscode from 'vscode';

/**
 * Configuration manager for Focus Space extension
 * Provides centralized access to settings with type safety and validation
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager | undefined;
    private disposables: vscode.Disposable[] = [];
    private readonly configSection = 'focusSpace';

    private constructor() {
        // Listen for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanged, this)
        );
    }

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        ConfigurationManager.instance = undefined;
    }

    // =============================================================================
    // APPEARANCE SETTINGS
    // =============================================================================

    public get hideWhenEmpty(): boolean {
        return this.get<boolean>('hideWhenEmpty', true);
    }

    public get showItemCount(): boolean {
        return this.get<boolean>('showItemCount', true);
    }

    public get showFileIcons(): boolean {
        return this.get<boolean>('showFileIcons', true);
    }

    public get sortOrder(): 'manual' | 'name' | 'dateAdded' | 'fileType' {
        return this.get<'manual' | 'name' | 'dateAdded' | 'fileType'>('sortOrder', 'manual');
    }

    // =============================================================================
    // BEHAVIOR SETTINGS
    // =============================================================================

    public get revealBehavior(): 'smart' | 'focus-space-only' | 'both' | 'disabled' {
        return this.get<'smart' | 'focus-space-only' | 'both' | 'disabled'>('revealBehavior', 'smart');
    }

    public get enableDragAndDrop(): boolean {
        return this.get<boolean>('enableDragAndDrop', true);
    }

    public get allowExternalDrop(): boolean {
        return this.get<boolean>('allowExternalDrop', true);
    }

    public get autoRevealActiveFile(): boolean {
        return this.get<boolean>('autoRevealActiveFile', true);
    }

    public get removeDeletedFiles(): boolean {
        return this.get<boolean>('removeDeletedFiles', true);
    }

    public get updateMovedFiles(): boolean {
        return this.get<boolean>('updateMovedFiles', true);
    }

    public get excludePatterns(): string[] {
        return this.get<string[]>('excludePatterns', [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/*.tmp',
            '**/*.log'
        ]);
    }

    public get doubleClickBehavior(): 'open' | 'reveal' | 'both' {
        return this.get<'open' | 'reveal' | 'both'>('doubleClickBehavior', 'open');
    }

    // =============================================================================
    // PERFORMANCE SETTINGS
    // =============================================================================

    public get enableFileWatcher(): boolean {
        return this.get<boolean>('enableFileWatcher', true);
    }

    public get maxFileSize(): number {
        return this.get<number>('maxFileSize', 10);
    }

    public get maxItemCount(): number {
        return this.get<number>('maxItemCount', 1000);
    }

    public get watcherDebounceMs(): number {
        return this.clampNumber(this.get<number>('watcherDebounceMs', 100), 50, 5000);
    }

    public get persistenceDebounceMs(): number {
        return this.clampNumber(this.get<number>('persistenceDebounceMs', 500), 100, 10000);
    }

    // =============================================================================
    // WORKFLOW SETTINGS
    // =============================================================================

    public get showInExplorerContext(): boolean {
        return this.get<boolean>('showInExplorerContext', true);
    }

    public get showInEditorTitle(): boolean {
        return this.get<boolean>('showInEditorTitle', true);
    }

    public get workspaceSpecificSettings(): boolean {
        return this.get<boolean>('workspaceSpecificSettings', true);
    }

    public get autoSaveEnabled(): boolean {
        return this.get<boolean>('autoSaveEnabled', true);
    }

    // =============================================================================
    // BUFFER MANAGEMENT SETTINGS  
    // =============================================================================

    public get closeNonFocusBuffersConfirmBeforeClose(): boolean {
        return this.get<boolean>('closeNonFocusBuffers.confirmBeforeClose', true);
    }

    public get closeNonFocusBuffersPreserveUnsaved(): boolean {
        return this.get<boolean>('closeNonFocusBuffers.preserveUnsaved', true);
    }

    public get closeNonFocusBuffersScope(): 'currentGroup' | 'allGroups' {
        return this.get<'currentGroup' | 'allGroups'>('closeNonFocusBuffers.scope', 'currentGroup');
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    public get<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get<T>(key, defaultValue);
    }

    public async set<T>(key: string, value: T, configurationTarget?: vscode.ConfigurationTarget): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update(key, value, configurationTarget);
    }

    public inspect<T>(key: string) {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.inspect<T>(key);
    }

    /**
     * Check if a file path matches any of the exclude patterns
     */
    public isExcluded(filePath: string): boolean {
        const patterns = this.excludePatterns;
        if (!Array.isArray(patterns) || patterns.length === 0) {
            return false;
        }

        const relativePath = vscode.workspace.asRelativePath(filePath);
        return patterns.some(pattern => {
            try {
                // Use VS Code's built-in glob matching
                const matcher = new RegExp(this.globToRegex(pattern));
                return matcher.test(relativePath) || matcher.test(filePath);
            } catch (error) {
                console.warn(`Invalid exclude pattern: ${pattern}`, error);
                return false;
            }
        });
    }

    /**
     * Get all configuration values as a structured object
     */
    public getAllSettings(): Record<string, any> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return {
            // Appearance
            hideWhenEmpty: this.hideWhenEmpty,
            showItemCount: this.showItemCount,
            showFileIcons: this.showFileIcons,
            sortOrder: this.sortOrder,

            // Behavior
            revealBehavior: this.revealBehavior,
            enableDragAndDrop: this.enableDragAndDrop,
            allowExternalDrop: this.allowExternalDrop,
            autoRevealActiveFile: this.autoRevealActiveFile,
            removeDeletedFiles: this.removeDeletedFiles,
            updateMovedFiles: this.updateMovedFiles,
            excludePatterns: this.excludePatterns,
            doubleClickBehavior: this.doubleClickBehavior,

            // Performance
            enableFileWatcher: this.enableFileWatcher,
            maxFileSize: this.maxFileSize,
            maxItemCount: this.maxItemCount,
            watcherDebounceMs: this.watcherDebounceMs,
            persistenceDebounceMs: this.persistenceDebounceMs,

            // Workflow
            showInExplorerContext: this.showInExplorerContext,
            showInEditorTitle: this.showInEditorTitle,
            workspaceSpecificSettings: this.workspaceSpecificSettings,
            autoSaveEnabled: this.autoSaveEnabled
        };
    }

    /**
     * Reset all settings to their default values
     */
    public async resetToDefaults(configurationTarget: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        const settingKeys = Object.keys(this.getAllSettings());

        for (const key of settingKeys) {
            await config.update(key, undefined, configurationTarget);
        }
    }

    /**
     * Validate current configuration and return any issues
     */
    public validateConfiguration(): string[] {
        const issues: string[] = [];

        // Validate numeric ranges
        const maxFileSize = this.maxFileSize;
        if (maxFileSize < 1 || maxFileSize > 100) {
            issues.push(`maxFileSize must be between 1 and 100 MB, got ${maxFileSize}`);
        }

        const maxItemCount = this.maxItemCount;
        if (maxItemCount < 10 || maxItemCount > 10000) {
            issues.push(`maxItemCount must be between 10 and 10000, got ${maxItemCount}`);
        }

        const watcherDebounce = this.watcherDebounceMs;
        if (watcherDebounce < 50 || watcherDebounce > 5000) {
            issues.push(`watcherDebounceMs must be between 50 and 5000 ms, got ${watcherDebounce}`);
        }

        const persistenceDebounce = this.persistenceDebounceMs;
        if (persistenceDebounce < 100 || persistenceDebounce > 10000) {
            issues.push(`persistenceDebounceMs must be between 100 and 10000 ms, got ${persistenceDebounce}`);
        }

        // Validate exclude patterns
        const patterns = this.excludePatterns;
        if (Array.isArray(patterns)) {
            for (const pattern of patterns) {
                try {
                    // Test if the pattern can be converted to a valid regex
                    new RegExp(this.globToRegex(pattern));
                } catch (error) {
                    console.error(`Invalid exclude pattern: ${pattern}`, error);
                    issues.push(`Invalid exclude pattern: ${pattern}`);
                }
            }
        } else if (patterns !== undefined) {
            issues.push(`excludePatterns must be an array, got ${typeof patterns}`);
        }

        return issues;
    }

    // =============================================================================
    // PRIVATE METHODS
    // =============================================================================

    private onConfigurationChanged(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration(this.configSection)) {
            // Emit event for components to react to configuration changes
            this.fireConfigurationChanged(event);
        }
    }

    private fireConfigurationChanged(event: vscode.ConfigurationChangeEvent): void {
        // This can be extended with an event emitter if needed
        // For now, components can listen to workspace.onDidChangeConfiguration directly
        console.log('Focus Space configuration changed', event);
    }

    private clampNumber(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    private globToRegex(glob: string): string {
        // Simple glob to regex conversion
        // This is a basic implementation - VS Code has more sophisticated matching
        return glob
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.')
            .replace(/\[([^\]]+)\]/g, '[$1]');
    }
}

// Export singleton instance for convenience
export const configuration = ConfigurationManager.getInstance();