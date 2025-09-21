import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceDragAndDropController, DragConflictResolution, DropTargetInfo } from '../../controllers/focusSpaceDragAndDropController';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { FocusEntry } from '../../models/focusEntry';

suite('FocusSpaceDragAndDropController Test Suite', () => {
    let controller: FocusSpaceDragAndDropController;
    let manager: FocusSpaceManager;
    let testContext: vscode.ExtensionContext;

    suiteSetup(async () => {
        // Create a mock context for testing
        testContext = {
            subscriptions: [],
            workspaceState: {
                get: () => undefined,
                update: async () => {},
                keys: () => []
            },
            globalState: {
                get: () => undefined,
                update: async () => {},
                keys: () => [],
                setKeysForSync: () => {}
            },
            extensionPath: '/test/path',
            extensionUri: vscode.Uri.file('/test/path'),
            environmentVariableCollection: {} as any,
            extensionMode: vscode.ExtensionMode.Test,
            globalStorageUri: vscode.Uri.file('/test/global'),
            logUri: vscode.Uri.file('/test/log'),
            storageUri: vscode.Uri.file('/test/storage'),
            secrets: {} as any,
            extension: {} as any,
            languageModelAccessInformation: {} as any,
            asAbsolutePath: (relativePath: string) => `/test/path/${relativePath}`,
            storagePath: '/test/storage',
            globalStoragePath: '/test/global',
            logPath: '/test/log'
        };
    });

    setup(async () => {
        manager = FocusSpaceManager.getInstance(testContext);
        await manager.clearAll();
        controller = new FocusSpaceDragAndDropController(manager);
    });

    teardown(async () => {
        await manager.clearAll();
    });

    test('should have correct MIME types', () => {
        assert.strictEqual(controller.dragMimeTypes.length, 1);
        assert.strictEqual(controller.dragMimeTypes[0], 'application/vnd.code.tree.focusspace');
        assert.strictEqual(controller.dropMimeTypes.length, 1);
        assert.strictEqual(controller.dropMimeTypes[0], 'application/vnd.code.tree.focusspace');
    });

    test('should handle drag operation', async () => {
        // Create test entries
        const testUri = vscode.Uri.file('/test/file.ts');
        const entry = await manager.addEntry(testUri, 'file', undefined, 'Test File');

        const dataTransfer = new vscode.DataTransfer();
        await controller.handleDrag([entry], dataTransfer);

        const transferItem = dataTransfer.get('application/vnd.code.tree.focusspace');
        assert.ok(transferItem);
        
        const dragData = JSON.parse(transferItem.value as string);
        assert.strictEqual(dragData.length, 1);
        assert.strictEqual(dragData[0].id, entry.id);
        assert.strictEqual(dragData[0].uri, testUri.toString());
        assert.strictEqual(dragData[0].type, 'file');
    });

    test('should handle drop operation with move between sections', async () => {
        // Create test setup
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        const section = await manager.createSection('Test Section');

        // Create mock data transfer
        const dragData = [{
            id: fileEntry.id,
            uri: fileEntry.uri.toString(),
            label: fileEntry.label,
            type: fileEntry.type
        }];

        const dataTransfer = new vscode.DataTransfer();
        dataTransfer.set('application/vnd.code.tree.focusspace', 
            new vscode.DataTransferItem(JSON.stringify(dragData)));

        // Execute drop
        await controller.handleDrop(section, dataTransfer, new vscode.CancellationTokenSource().token);

        // Verify the file was moved to the section
        const sectionEntries = manager.getEntries(section.id);
        assert.strictEqual(sectionEntries.length, 1);
        assert.strictEqual(sectionEntries[0].uri.toString(), fileUri.toString());

        // Verify it was removed from root
        const rootEntries = manager.getTopLevelEntries();
        const fileInRoot = rootEntries.find(e => e.uri.toString() === fileUri.toString());
        assert.strictEqual(fileInRoot, undefined);
    });

    test('should handle self-drop by ignoring it', async () => {
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');

        const dragData = [{
            id: fileEntry.id,
            uri: fileEntry.uri.toString(),
            label: fileEntry.label,
            type: fileEntry.type
        }];

        const dataTransfer = new vscode.DataTransfer();
        dataTransfer.set('application/vnd.code.tree.focusspace', 
            new vscode.DataTransferItem(JSON.stringify(dragData)));

        // Drop on itself should be ignored
        await controller.handleDrop(fileEntry, dataTransfer, new vscode.CancellationTokenSource().token);

        // File should still be at root level
        const rootEntries = manager.getTopLevelEntries();
        const fileInRoot = rootEntries.find(e => e.id === fileEntry.id);
        assert.ok(fileInRoot);
    });

    test('should handle cancellation token', async () => {
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        const section = await manager.createSection('Test Section');

        const dragData = [{
            id: fileEntry.id,
            uri: fileEntry.uri.toString(),
            label: fileEntry.label,
            type: fileEntry.type
        }];

        const dataTransfer = new vscode.DataTransfer();
        dataTransfer.set('application/vnd.code.tree.focusspace', 
            new vscode.DataTransferItem(JSON.stringify(dragData)));

        // Create cancelled token
        const tokenSource = new vscode.CancellationTokenSource();
        tokenSource.cancel();

        // Should return early without error
        await controller.handleDrop(section, dataTransfer, tokenSource.token);

        // File should still be at root (operation was cancelled)
        const rootEntries = manager.getTopLevelEntries();
        const fileInRoot = rootEntries.find(e => e.id === fileEntry.id);
        assert.ok(fileInRoot);
    });

    test('should handle invalid data transfer', async () => {
        const section = await manager.createSection('Test Section');
        const dataTransfer = new vscode.DataTransfer();
        // No data set in transfer

        // Should handle gracefully without error
        await controller.handleDrop(section, dataTransfer, new vscode.CancellationTokenSource().token);
        
        // Section should still exist and be empty
        const sectionEntries = manager.getEntries(section.id);
        assert.strictEqual(sectionEntries.length, 0);
    });

    test('should handle malformed JSON in data transfer', async () => {
        const section = await manager.createSection('Test Section');
        const dataTransfer = new vscode.DataTransfer();
        dataTransfer.set('application/vnd.code.tree.focusspace', 
            new vscode.DataTransferItem('invalid json'));

        // Should handle gracefully without throwing
        try {
            await controller.handleDrop(section, dataTransfer, new vscode.CancellationTokenSource().token);
        } catch (error) {
            // Error handling is done via vscode.window.showErrorMessage
            // The operation should not throw
            assert.fail('Should not throw error, should handle gracefully');
        }
    });
});