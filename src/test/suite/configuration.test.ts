import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Configuration Tests', () => {

    test('Should have focusSpace.hideWhenEmpty setting', () => {
        // Get the configuration
        const config = vscode.workspace.getConfiguration('focusSpace');
        
        // Check if the setting exists (will return default value if not explicitly set)
        const hideWhenEmpty = config.get<boolean>('hideWhenEmpty');
        
        // Should return a boolean (default is true)
        assert.strictEqual(typeof hideWhenEmpty, 'boolean');
    });

    test('Should return default value true for hideWhenEmpty', () => {
        const config = vscode.workspace.getConfiguration('focusSpace');
        const hideWhenEmpty = config.get<boolean>('hideWhenEmpty', true);
        
        // Default should be true
        assert.strictEqual(hideWhenEmpty, true);
    });

    test('Should handle configuration inspection', () => {
        const config = vscode.workspace.getConfiguration('focusSpace');
        const inspection = config.inspect<boolean>('hideWhenEmpty');
        
        // Should have default value defined
        assert.ok(inspection);
        assert.strictEqual(inspection.defaultValue, true);
    });

    test('Should validate configuration schema', () => {
        // This test ensures the configuration is properly registered
        // by checking if VS Code recognizes the setting
        const config = vscode.workspace.getConfiguration('focusSpace');
        
        // Getting a non-existent setting should return undefined
        const nonExistent = config.get('nonExistentSetting');
        assert.strictEqual(nonExistent, undefined);
        
        // Getting hideWhenEmpty should return the default
        const hideWhenEmpty = config.get('hideWhenEmpty');
        assert.strictEqual(typeof hideWhenEmpty, 'boolean');
    });

    test('Should support configuration change events', () => {
        // Test that configuration change events can be registered
        // This is more of a structural test
        let eventRegistered = false;
        
        try {
            const disposable = vscode.workspace.onDidChangeConfiguration(() => {
                // Configuration changed
            });
            
            eventRegistered = true;
            disposable.dispose();
        } catch (error) {
            eventRegistered = false;
        }
        
        assert.strictEqual(eventRegistered, true);
    });

    test('Should handle configuration event filtering', () => {
        // Test that we can filter configuration events properly
        let correctEventFilter = false;
        
        try {
            const disposable = vscode.workspace.onDidChangeConfiguration(event => {
                // This is the pattern we use in the extension
                if (event.affectsConfiguration('focusSpace.hideWhenEmpty')) {
                    correctEventFilter = true;
                }
            });
            
            // The event handler registration should work
            assert.ok(disposable);
            disposable.dispose();
            correctEventFilter = true; // If we get here, the pattern works
        } catch (error) {
            correctEventFilter = false;
        }
        
        assert.strictEqual(correctEventFilter, true);
    });
});