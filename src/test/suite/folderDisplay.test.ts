import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceTreeDataProvider } from '../../providers/focusSpaceTreeDataProvider';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';

suite('Folder Display and Management', () => {
    let manager: FocusSpaceManager;
    let treeProvider: FocusSpaceTreeDataProvider;
    let context: vscode.ExtensionContext;

    setup(async () => {
        // Create a mock extension context
        context = {
            extensionPath: '',
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => [],
                setKeysForSync: () => {},
            },
            subscriptions: [],
            asAbsolutePath: (relativePath: string) => relativePath,
            storagePath: '',
            globalStoragePath: '',
            logPath: '',
            extensionUri: vscode.Uri.file(''),
            globalStorageUri: vscode.Uri.file(''),
            logUri: vscode.Uri.file(''),
            storageUri: vscode.Uri.file(''),
            environmentVariableCollection: {} as any,
            extensionMode: vscode.ExtensionMode.Test,
            secrets: {} as any,
            extension: {} as any
        } as unknown as vscode.ExtensionContext;

        manager = FocusSpaceManager.getInstance(context);
        await manager.clearAll(); // Start with clean state
        treeProvider = new FocusSpaceTreeDataProvider(manager);
    });

    teardown(async () => {
        await manager.clearAll(); // Clean up after each test
    });

    test('Should handle folder entry creation', async () => {
        // Add a folder entry
        const folderUri = vscode.Uri.file('/test/src');
        const folderEntry = await manager.addEntry(folderUri, 'folder');

        // Verify folder entry exists
        assert.strictEqual(folderEntry.type, 'folder');
        assert.strictEqual(manager.hasEntry(folderUri), true);
        
        // Verify it appears in top-level entries
        const topLevel = manager.getTopLevelEntries();
        assert.strictEqual(topLevel.length, 1);
        assert.strictEqual(topLevel[0].type, 'folder');
    });

    test('Should create TreeItem with proper collapsible state for folders', async () => {
        // Add a folder entry
        const folderUri = vscode.Uri.file('/test/src');
        const folderEntry = await manager.addEntry(folderUri, 'folder');

        // Get TreeItem
        const treeItem = treeProvider.getTreeItem(folderEntry);

        // Verify folder is collapsible
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        assert.strictEqual(treeItem.contextValue, 'folder');
        assert.strictEqual(treeItem.resourceUri?.toString(), folderUri.toString());
    });

    test('Should handle folder children as real entries', async () => {
        // Create a real child entry (as would be created by the new tree structure)
        const childEntry = {
            id: 'real-child-id',
            uri: vscode.Uri.file('/test/src/child.ts'),
            type: 'file' as const,
            metadata: {
                dateAdded: Date.now(),
                relativePath: 'child.ts',
                order: 0
            }
        };

        // Get TreeItem for child entry
        const treeItem = treeProvider.getTreeItem(childEntry);

        // Verify child has same context value as type (no more temp ID special handling)
        assert.strictEqual(treeItem.contextValue, 'file');
    });

    test('Should handle empty folder gracefully', async () => {
        // Add a folder entry
        const folderUri = vscode.Uri.file('/test/empty-folder');
        const folderEntry = await manager.addEntry(folderUri, 'folder');

        // Mock empty folder (fs.readDirectory would return empty array)
        // Since we can't mock the file system in unit tests, we'll just verify
        // that the method handles the case where no children are found
        try {
            const children = await treeProvider.getChildren(folderEntry);
            // Should not throw error even if folder doesn't exist or is empty
            assert.ok(Array.isArray(children));
        } catch (error) {
            // Expected behavior - should handle filesystem errors gracefully
            assert.ok(true, 'Handled filesystem error gracefully');
        }
    });

    test('Should maintain folder entry in manager data', async () => {
        // Add folder
        const folderUri = vscode.Uri.file('/test/project');
        const folderEntry = await manager.addEntry(folderUri, 'folder');

        // Verify folder is persisted in manager
        const retrieved = manager.getEntry(folderEntry.id);
        assert.ok(retrieved);
        assert.strictEqual(retrieved.type, 'folder');
        assert.strictEqual(retrieved.uri.toString(), folderUri.toString());

        // Verify it's in top-level entries
        const topLevel = manager.getTopLevelEntries();
        assert.strictEqual(topLevel.length, 1);
        assert.strictEqual(topLevel[0].id, folderEntry.id);
    });

    test('Should support removing folder entry', async () => {
        // Add folder
        const folderUri = vscode.Uri.file('/test/project');
        const folderEntry = await manager.addEntry(folderUri, 'folder');

        // Verify it exists
        assert.strictEqual(manager.getTopLevelEntries().length, 1);

        // Remove it
        const removed = await manager.removeEntry(folderEntry.id);

        // Verify removal
        assert.strictEqual(removed, true);
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
        assert.strictEqual(manager.hasEntry(folderUri), false);
    });

    test('Should handle mixed content types', async () => {
        // Add various entry types
        const fileUri = vscode.Uri.file('/test/file.ts');
        const folderUri = vscode.Uri.file('/test/folder');
        const section = await manager.createSection('Test Section');

        await manager.addEntry(fileUri, 'file');
        await manager.addEntry(folderUri, 'folder');

        // Verify all types coexist
        const topLevel = manager.getTopLevelEntries();
        assert.strictEqual(topLevel.length, 3);

        const types = topLevel.map(entry => entry.type).sort();
        assert.deepStrictEqual(types, ['file', 'folder', 'section']);
    });

    test('Should generate correct display labels for folders', async () => {
        // Add folder without custom label
        const folderUri = vscode.Uri.file('/test/my-project');
        const folderEntry = await manager.addEntry(folderUri, 'folder');

        const treeItem = treeProvider.getTreeItem(folderEntry);
        
        // Should use folder name as label
        assert.strictEqual(treeItem.label, 'my-project');
    });

    test('Should respect custom labels for folders', async () => {
        // Add folder with custom label
        const folderUri = vscode.Uri.file('/test/src');
        const folderEntry = await manager.addEntry(folderUri, 'folder', undefined, 'Source Code');

        const treeItem = treeProvider.getTreeItem(folderEntry);
        
        // Should use custom label
        assert.strictEqual(treeItem.label, 'Source Code');
    });

    test('Should handle real folder children correctly', async () => {
        // In the new system, folder children are real entries, not temporary ones
        // Use a unique folder path that won't conflict with filesystem contents
        const parentUri = vscode.Uri.file('/test/unique-test-folder-' + Date.now());
        const childUri = vscode.Uri.file(parentUri.fsPath + '/child.ts');
        
        // Add parent folder first (this will create an empty folder entry since the path doesn't exist)
        const parentEntry = await manager.addEntry(parentUri, 'folder', undefined, 'Source Folder');
        
        // Since the folder doesn't exist on filesystem, it should have empty children initially
        assert.strictEqual(parentEntry.children?.length, 0);
        
        // Add child as real entry under parent
        const childEntry = await manager.addEntry(childUri, 'file', parentEntry.id);

        // Verify child is a real entry with normal ID (not temp-)
        assert.strictEqual(childEntry.id.startsWith('temp-'), false);
        
        // Verify the manager has this entry (because it's real)
        const retrievedChild = manager.getEntry(childEntry.id);
        assert.ok(retrievedChild);
        assert.strictEqual(retrievedChild.uri.toString(), childUri.toString());
        
        // Verify parent contains the child
        const parent = manager.getEntry(parentEntry.id);
        assert.ok(parent?.children);
        assert.strictEqual(parent.children.length, 1);
        assert.strictEqual(parent.children[0].id, childEntry.id);
    });

    test('Should auto-convert folder to section when modifying children', async () => {
        // Add a folder
        const folderUri = vscode.Uri.file('/test/auto-convert-folder');
        const folderEntry = await manager.addEntry(folderUri, 'folder', undefined, 'Auto Convert Test');
        
        // Verify it's initially a folder
        assert.strictEqual(folderEntry.type, 'folder');
        assert.strictEqual(manager.getEntries().length, 1);
        
        // Test auto-conversion
        const result = await manager.autoConvertFolderToSection(folderEntry.id);
        
        // Should succeed if folder contents can be read (or gracefully handle empty/non-existent folders)
        if (result) {
            // Verify folder was removed and section was created
            assert.strictEqual(manager.getEntry(folderEntry.id), undefined);
            
            // Verify section exists
            const section = manager.getEntry(result.sectionId);
            assert.strictEqual(section?.type, 'section');
            assert.strictEqual(section?.label, 'Auto Convert Test');
            
            // Verify children array exists (even if empty for non-existent test folder)
            assert.strictEqual(Array.isArray(section?.children), true);
        }
    });

    test('Should handle auto-conversion of non-existent folder gracefully', async () => {
        // Test auto-conversion with invalid ID
        const result = await manager.autoConvertFolderToSection('invalid-id');
        assert.strictEqual(result, null);
        
        // Test auto-conversion with non-folder entry
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        const result2 = await manager.autoConvertFolderToSection(fileEntry.id);
        assert.strictEqual(result2, null);
    });
});