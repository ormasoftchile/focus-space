import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';

suite('FocusSpaceManager Tests', () => {
    let manager: FocusSpaceManager;
    let mockContext: vscode.ExtensionContext;

    // Create a mock extension context for testing
    const createMockContext = (): vscode.ExtensionContext => {
        return {
            subscriptions: [],
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve()
            } as any,
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                setKeysForSync: () => {}
            } as any,
            extensionUri: vscode.Uri.file('/mock/extension'),
            extensionPath: '/mock/extension',
            storagePath: '/mock/storage',
            globalStoragePath: '/mock/global-storage',
            logPath: '/mock/log',
            asAbsolutePath: (relativePath: string) => `/mock/extension/${relativePath}`,
            storageUri: vscode.Uri.file('/mock/storage'),
            globalStorageUri: vscode.Uri.file('/mock/global-storage'),
            logUri: vscode.Uri.file('/mock/log'),
            extensionMode: vscode.ExtensionMode.Test,
            secrets: undefined as any,
            environmentVariableCollection: undefined as any,
            extension: undefined as any,
            languageModelAccessInformation: undefined as any
        };
    };

    setup(() => {
        mockContext = createMockContext();
        manager = FocusSpaceManager.getInstance(mockContext);
    });

    teardown(async () => {
        await manager.clearAll();
    });

    test('Should create singleton instance', () => {
        const manager1 = FocusSpaceManager.getInstance(mockContext);
        const manager2 = FocusSpaceManager.getInstance();
        assert.strictEqual(manager1, manager2);
    });

    test('Should throw error if no context provided for first instance', () => {
        // Reset singleton for this test
        (FocusSpaceManager as any).instance = undefined;
        
        assert.throws(() => {
            FocusSpaceManager.getInstance();
        }, /requires context/);
    });

    test('Should add file entry', async () => {
        const testUri = vscode.Uri.file('/test/file.ts');
        const entry = await manager.addEntry(testUri, 'file');

        assert.ok(entry.id);
        assert.strictEqual(entry.uri.toString(), testUri.toString());
        assert.strictEqual(entry.type, 'file');
        assert.ok(entry.metadata);
        assert.ok(typeof entry.metadata.dateAdded === 'number');
    });

    test('Should add folder entry', async () => {
        const testUri = vscode.Uri.file('/test/folder');
        const entry = await manager.addEntry(testUri, 'folder');

        assert.strictEqual(entry.type, 'folder');
        assert.strictEqual(entry.uri.toString(), testUri.toString());
    });

    test('Should create section with children array', async () => {
        const section = await manager.createSection('Test Section');

        assert.strictEqual(section.type, 'section');
        assert.strictEqual(section.label, 'Test Section');
        assert.ok(Array.isArray(section.children));
        assert.strictEqual(section.children.length, 0);
    });

    test('Should retrieve entry by ID', async () => {
        const testUri = vscode.Uri.file('/test/retrieve.ts');
        const entry = await manager.addEntry(testUri, 'file');
        
        const retrieved = manager.getEntry(entry.id);
        assert.ok(retrieved);
        assert.strictEqual(retrieved.id, entry.id);
        assert.strictEqual(retrieved.uri.toString(), testUri.toString());
    });

    test('Should check if entry exists for URI', async () => {
        const testUri = vscode.Uri.file('/test/exists.ts');
        
        assert.strictEqual(manager.hasEntry(testUri), false);
        
        await manager.addEntry(testUri, 'file');
        assert.strictEqual(manager.hasEntry(testUri), true);
    });

    test('Should remove entry', async () => {
        const testUri = vscode.Uri.file('/test/remove.ts');
        const entry = await manager.addEntry(testUri, 'file');
        
        assert.ok(manager.getEntry(entry.id));
        
        const removed = await manager.removeEntry(entry.id);
        assert.strictEqual(removed, true);
        assert.strictEqual(manager.getEntry(entry.id), undefined);
    });

    test('Should return false when removing non-existent entry', async () => {
        const removed = await manager.removeEntry('non-existent-id');
        assert.strictEqual(removed, false);
    });

    test('Should get top-level entries', async () => {
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        const section = await manager.createSection('Test Section');

        const entries = manager.getEntries();
        assert.strictEqual(entries.length, 3);
        
        const ids = entries.map(e => e.id);
        assert.ok(ids.includes(file1.id));
        assert.ok(ids.includes(file2.id));
        assert.ok(ids.includes(section.id));
    });

    test('Should move entry to section', async () => {
        const file = await manager.addEntry(vscode.Uri.file('/test/file.ts'), 'file');
        const section = await manager.createSection('Test Section');

        const moved = await manager.moveToSection(file.id, section.id);
        assert.strictEqual(moved, true);

        const sectionEntries = manager.getEntries(section.id);
        assert.strictEqual(sectionEntries.length, 1);
        assert.strictEqual(sectionEntries[0].id, file.id);

        // Should no longer be in top-level
        const topLevel = manager.getEntries();
        assert.strictEqual(topLevel.find(e => e.id === file.id), undefined);
    });

    test('Should allow moving section to another section (nested sections)', async () => {
        const section1 = await manager.createSection('Section 1');
        const section2 = await manager.createSection('Section 2');

        const moved = await manager.moveToSection(section1.id, section2.id);
        assert.strictEqual(moved, true);
        
        // Verify section1 is now a child of section2
        const parentSection = manager.getEntry(section2.id);
        assert.ok(parentSection?.children?.some(child => child.id === section1.id));
    });

    test('Should clear all entries', async () => {
        await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        await manager.createSection('Test Section');

        let entries = manager.getEntries();
        assert.ok(entries.length > 0);

        await manager.clearAll();
        entries = manager.getEntries();
        assert.strictEqual(entries.length, 0);
    });

    test('Should generate unique IDs', async () => {
        const entry1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const entry2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');

        assert.notStrictEqual(entry1.id, entry2.id);
        assert.ok(entry1.id.startsWith('focus-'));
        assert.ok(entry2.id.startsWith('focus-'));
    });
});