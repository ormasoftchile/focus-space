import * as vscode from 'vscode';
import { configuration } from './configurationManager';

/**
 * Migration utility for Focus Space configuration settings
 */
export class ConfigurationMigrator {
    private static readonly MIGRATION_VERSION_KEY = 'focusSpace.migrationVersion';
    private static readonly CURRENT_VERSION = '1.0.0';

    /**
     * Run any necessary configuration migrations
     */
    public static async runMigrations(context: vscode.ExtensionContext): Promise<void> {
        const lastMigrationVersion = context.globalState.get<string>(this.MIGRATION_VERSION_KEY, '0.0.0');
        
        if (this.needsMigration(lastMigrationVersion)) {
            try {
                await this.performMigrations(lastMigrationVersion);
                await context.globalState.update(this.MIGRATION_VERSION_KEY, this.CURRENT_VERSION);
            } catch (error) {
                vscode.window.showErrorMessage('Focus Space: Configuration migration failed. Some settings may need to be reconfigured.');
            }
        }
    }

    /**
     * Check if migration is needed
     */
    private static needsMigration(lastVersion: string): boolean {
        return this.compareVersions(lastVersion, this.CURRENT_VERSION) < 0;
    }

    /**
     * Perform necessary migrations based on version ranges
     */
    private static async performMigrations(fromVersion: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('focusSpace');

        // Migration from pre-1.0.0 (initial configuration structure)
        if (this.compareVersions(fromVersion, '1.0.0') < 0) {
            await this.migrateToV1(config);
        }

        // Future migrations can be added here
        // if (this.compareVersions(fromVersion, '1.1.0') < 0) {
        //     await this.migrateToV1_1(config);
        // }
    }

    /**
     * Migration to version 1.0.0 - Initial comprehensive configuration
     */
    private static async migrateToV1(config: vscode.WorkspaceConfiguration): Promise<void> {
        // Check for legacy settings that might need to be renamed or restructured
        
        // If hideWhenEmpty was previously set as a string, convert to boolean
        const hideWhenEmpty = config.get('hideWhenEmpty');
        if (typeof hideWhenEmpty === 'string') {
            const boolValue = hideWhenEmpty.toLowerCase() === 'true';
            await config.update('hideWhenEmpty', boolValue, vscode.ConfigurationTarget.Global);
        }

        // Add default exclude patterns if none exist
        const excludePatterns = config.get<string[]>('excludePatterns');
        if (!excludePatterns || excludePatterns.length === 0) {
            await config.update('excludePatterns', [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/build/**',
                '**/*.tmp',
                '**/*.log'
            ], vscode.ConfigurationTarget.Global);
        }

        // Ensure reveal behavior has the 'disabled' option available
        const revealBehavior = config.get<string>('revealBehavior');
        if (revealBehavior && !['smart', 'focus-space-only', 'both', 'disabled'].includes(revealBehavior)) {
            await config.update('revealBehavior', 'smart', vscode.ConfigurationTarget.Global);
        }

    }

    /**
     * Compare version strings (simplified semver comparison)
     */
    private static compareVersions(version1: string, version2: string): number {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part < v2Part) {
                return -1;
            }
            if (v1Part > v2Part) {
                return 1;
            }
        }
        
        return 0;
    }

    /**
     * Validate current configuration and fix any issues
     */
    public static async validateAndFixConfiguration(): Promise<string[]> {
        const issues = configuration.validateConfiguration();
        const fixedIssues: string[] = [];

        if (issues.length > 0) {
            // Try to fix some common issues automatically
            for (const issue of issues) {
                if (issue.includes('maxFileSize')) {
                    await configuration.set('maxFileSize', 10);
                    fixedIssues.push('Reset maxFileSize to default (10 MB)');
                } else if (issue.includes('maxItemCount')) {
                    await configuration.set('maxItemCount', 1000);
                    fixedIssues.push('Reset maxItemCount to default (1000)');
                } else if (issue.includes('watcherDebounceMs')) {
                    await configuration.set('watcherDebounceMs', 100);
                    fixedIssues.push('Reset watcherDebounceMs to default (100 ms)');
                } else if (issue.includes('persistenceDebounceMs')) {
                    await configuration.set('persistenceDebounceMs', 500);
                    fixedIssues.push('Reset persistenceDebounceMs to default (500 ms)');
                }
            }

            if (fixedIssues.length > 0) {
                vscode.window.showInformationMessage(
                    `Focus Space: Fixed ${fixedIssues.length} configuration issue(s). Check settings for details.`
                );
            }
        }

        return fixedIssues;
    }

    /**
     * Reset all configuration to defaults
     */
    public static async resetToDefaults(): Promise<void> {
        await configuration.resetToDefaults();
        vscode.window.showInformationMessage('Focus Space: All settings have been reset to defaults.');
    }

    /**
     * Export current configuration
     */
    public static exportConfiguration(): any {
        return {
            version: this.CURRENT_VERSION,
            timestamp: new Date().toISOString(),
            settings: configuration.getAllSettings()
        };
    }

    /**
     * Import configuration (basic implementation)
     */
    public static async importConfiguration(configData: any): Promise<void> {
        if (!configData.settings) {
            throw new Error('Invalid configuration data: missing settings');
        }

        const config = vscode.workspace.getConfiguration('focusSpace');
        const settings = configData.settings;

        // Import each setting individually with validation
        for (const [key, value] of Object.entries(settings)) {
            try {
                await config.update(key, value, vscode.ConfigurationTarget.Workspace);
            } catch {
                // Skip invalid settings
            }
        }

        vscode.window.showInformationMessage('Focus Space: Configuration imported successfully.');
    }
}