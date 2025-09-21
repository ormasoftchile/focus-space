import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';

suite('Commands - Remove Operations', () => {
    let manager: FocusSpaceManager;
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
    });

    teardown(async () => {
        await manager.clearAll(); // Clean up after each test
    });

    test('Remove single file entry', async () => {
        // Add a test file
        const fileUri = vscode.Uri.file('/test/file.ts');
        const entry = await manager.addEntry(fileUri, 'file');
        
        // Verify it exists
        assert.strictEqual(manager.hasEntry(fileUri), true);
        assert.strictEqual(manager.getTopLevelEntries().length, 1);

        // Remove it
        const removed = await manager.removeEntry(entry.id);
        
        // Verify removal
        assert.strictEqual(removed, true);
        assert.strictEqual(manager.hasEntry(fileUri), false);
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
    });

    test('Remove folder entry', async () => {
        // Add a test folder
        const folderUri = vscode.Uri.file('/test/folder');
        const entry = await manager.addEntry(folderUri, 'folder');
        
        // Verify it exists
        assert.strictEqual(manager.hasEntry(folderUri), true);
        assert.strictEqual(manager.getTopLevelEntries().length, 1);

        // Remove it
        const removed = await manager.removeEntry(entry.id);
        
        // Verify removal
        assert.strictEqual(removed, true);
        assert.strictEqual(manager.hasEntry(folderUri), false);
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
    });

    test('Remove section with children', async () => {
        // Create a section with files
        const section = await manager.createSection('Test Section');
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        await manager.moveToSection(fileEntry.id, section.id);

        // Verify setup
        assert.strictEqual(manager.getTopLevelEntries().length, 1);
        assert.strictEqual(section.children?.length, 1);

        // Remove the section
        const removed = await manager.removeEntry(section.id);
        
        // Verify section is removed
        assert.strictEqual(removed, true);
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
        
        // Verify child entries are also cleaned up
        assert.strictEqual(manager.getEntry(fileEntry.id), undefined);
    });

    test('Remove child from section', async () => {
        // Create a section with files
        const section = await manager.createSection('Test Section');
        const file1Uri = vscode.Uri.file('/test/file1.ts');
        const file2Uri = vscode.Uri.file('/test/file2.ts');
        const file1Entry = await manager.addEntry(file1Uri, 'file');
        const file2Entry = await manager.addEntry(file2Uri, 'file');
        
        await manager.moveToSection(file1Entry.id, section.id);
        await manager.moveToSection(file2Entry.id, section.id);

        // Verify setup
        assert.strictEqual(section.children?.length, 2);

        // Remove one child
        const removed = await manager.removeEntry(file1Entry.id);
        
        // Verify removal
        assert.strictEqual(removed, true);
        assert.strictEqual(section.children?.length, 1);
        assert.strictEqual(section.children?.[0].id, file2Entry.id);
        assert.strictEqual(manager.getEntry(file1Entry.id), undefined);
        assert.strictEqual(manager.getEntry(file2Entry.id), file2Entry);
    });

    test('Remove non-existent entry returns false', async () => {
        const removed = await manager.removeEntry('non-existent-id');
        assert.strictEqual(removed, false);
    });

    test('Clear all entries', async () => {
        // Add various types of entries
        const fileUri = vscode.Uri.file('/test/file.ts');
        const folderUri = vscode.Uri.file('/test/folder');
        const section = await manager.createSection('Test Section');
        
        await manager.addEntry(fileUri, 'file');
        await manager.addEntry(folderUri, 'folder');

        // Verify entries exist
        assert.strictEqual(manager.getTopLevelEntries().length, 3);

        // Clear all
        await manager.clearAll();

        // Verify all cleared
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
        assert.strictEqual(manager.hasEntry(fileUri), false);
        assert.strictEqual(manager.hasEntry(folderUri), false);
        assert.strictEqual(manager.getEntry(section.id), undefined);
    });

    test('Remove entry updates parent children array', async () => {
        // Create section with multiple children
        const section = await manager.createSection('Parent Section');
        const file1Uri = vscode.Uri.file('/test/file1.ts');
        const file2Uri = vscode.Uri.file('/test/file2.ts');
        const file3Uri = vscode.Uri.file('/test/file3.ts');
        
        const file1Entry = await manager.addEntry(file1Uri, 'file');
        const file2Entry = await manager.addEntry(file2Uri, 'file');
        const file3Entry = await manager.addEntry(file3Uri, 'file');
        
        await manager.moveToSection(file1Entry.id, section.id);
        await manager.moveToSection(file2Entry.id, section.id);
        await manager.moveToSection(file3Entry.id, section.id);

        // Verify initial state
        assert.strictEqual(section.children?.length, 3);

        // Remove middle child
        await manager.removeEntry(file2Entry.id);

        // Verify the children array is properly updated
        assert.strictEqual(section.children?.length, 2);
        assert.strictEqual(section.children?.[0].id, file1Entry.id);
        assert.strictEqual(section.children?.[1].id, file3Entry.id);
        
        // Verify the removed entry is gone
        assert.strictEqual(manager.getEntry(file2Entry.id), undefined);
    });
});