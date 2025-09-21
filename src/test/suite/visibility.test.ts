import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';

suite('Visibility Tests', () => {
    let manager: FocusSpaceManager;
    let mockContext: vscode.ExtensionContext;
    let contextValues: Map<string, any> = new Map();

    setup(() => {
        // Reset context values
        contextValues.clear();
        
        // Create mock context
        mockContext = {
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            subscriptions: [],
            extensionPath: '/test/path'
        } as any;

        manager = FocusSpaceManager.getInstance(mockContext);
        
        // Mock vscode.commands.executeCommand to capture setContext calls
        const originalExecuteCommand = vscode.commands.executeCommand;
        (vscode.commands as any).executeCommand = (command: string, ...args: any[]) => {
            if (command === 'setContext' && args.length >= 2) {
                contextValues.set(args[0], args[1]);
                return Promise.resolve();
            }
            return originalExecuteCommand(command, ...args);
        };
    });

    teardown(async () => {
        await manager.clearAll();
    });

    test('Should set hasItems context to false when no entries', () => {
        // Simulate the visibility update logic
        const hasItems = manager.getTopLevelEntries().length > 0;
        const hideWhenEmpty = true; // default setting
        const shouldShow = hasItems || !hideWhenEmpty;
        
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), false);
    });

    test('Should set hasItems context to true when entries exist', async () => {
        // Add an entry
        const fileUri = vscode.Uri.file('/test/file.ts');
        await manager.addEntry(fileUri, 'file');
        
        // Simulate the visibility update logic
        const hasItems = manager.getTopLevelEntries().length > 0;
        const hideWhenEmpty = true; // default setting
        const shouldShow = hasItems || !hideWhenEmpty;
        
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), true);
    });

    test('Should respect hideWhenEmpty setting when false', () => {
        // Simulate hideWhenEmpty = false
        const hasItems = manager.getTopLevelEntries().length > 0; // false (no items)
        const hideWhenEmpty = false; // setting disabled
        const shouldShow = hasItems || !hideWhenEmpty;
        
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        
        // Should show even with no items because hideWhenEmpty is false
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), true);
    });

    test('Should hide when empty and hideWhenEmpty is true', () => {
        // Simulate hideWhenEmpty = true (default)
        const hasItems = manager.getTopLevelEntries().length > 0; // false (no items)
        const hideWhenEmpty = true; // setting enabled
        const shouldShow = hasItems || !hideWhenEmpty;
        
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        
        // Should hide when empty and setting is true
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), false);
    });

    test('Should show when has items regardless of hideWhenEmpty setting', async () => {
        // Add an entry
        const fileUri = vscode.Uri.file('/test/file.ts');
        await manager.addEntry(fileUri, 'file');
        
        // Test with hideWhenEmpty = true
        let hasItems = manager.getTopLevelEntries().length > 0; // true
        let hideWhenEmpty = true;
        let shouldShow = hasItems || !hideWhenEmpty;
        
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), true);
        
        // Test with hideWhenEmpty = false
        hideWhenEmpty = false;
        shouldShow = hasItems || !hideWhenEmpty;
        
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), true);
    });

    test('Should update context when entries change', async () => {
        // Initially no items
        let hasItems = manager.getTopLevelEntries().length > 0;
        let shouldShow = hasItems || false; // hideWhenEmpty = true
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), false);
        
        // Add entry
        const fileUri = vscode.Uri.file('/test/file.ts');
        const entry = await manager.addEntry(fileUri, 'file');
        
        // Update context
        hasItems = manager.getTopLevelEntries().length > 0;
        shouldShow = hasItems || false;
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), true);
        
        // Remove entry
        await manager.removeEntry(entry.id);
        
        // Update context
        hasItems = manager.getTopLevelEntries().length > 0;
        shouldShow = hasItems || false;
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), false);
    });

    test('Should handle section children correctly in visibility logic', async () => {
        // Create section with children - this should count as having items
        const section = await manager.createSection('Test Section');
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        await manager.moveToSection(fileEntry.id, section.id);
        
        // Section should be in top-level entries
        const hasItems = manager.getTopLevelEntries().length > 0;
        const shouldShow = hasItems || false;
        
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
        assert.strictEqual(contextValues.get('focusSpace.hasItems'), true);
    });
});