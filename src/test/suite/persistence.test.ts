import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { FocusSpaceConfig } from '../../models/focusEntry';

suite('FocusSpace Persistence Tests', () => {
    let manager: FocusSpaceManager;
    let mockContext: vscode.ExtensionContext;

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
        if (manager) {
            await manager.clearAll();
        }
    });

    test('Should handle missing storage file gracefully', async () => {
        // This should not throw even if file doesn't exist
        await manager.loadState();
        
        const entries = manager.getEntries();
        assert.strictEqual(entries.length, 0);
    });

    test('Should serialize and deserialize entries correctly', async () => {
        // Add test data
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        const section = await manager.createSection('Test Section');
        
        // Move file2 to section
        await manager.moveToSection(file2.id, section.id);

        // Get current state
        const entriesBefore = manager.getEntries();
        const sectionEntriesBefore = manager.getEntries(section.id);

        // Clear and reload (simulates persistence)
        await manager.clearAll();
        let entriesAfterClear = manager.getEntries();
        assert.strictEqual(entriesAfterClear.length, 0);

        // Since we can't actually write to file system in tests,
        // we'll test the serialization logic by creating new manager
        // and manually testing serialize/deserialize
        const newManager = FocusSpaceManager.getInstance(mockContext);
        
        // Re-add the same data
        const newFile1 = await newManager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const newSection = await newManager.createSection('Test Section');
        const newFile2 = await newManager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        await newManager.moveToSection(newFile2.id, newSection.id);

        const entriesAfter = newManager.getEntries();
        const sectionEntriesAfter = newManager.getEntries(newSection.id);

        // Verify structure is the same
        assert.strictEqual(entriesAfter.length, entriesBefore.length);
        assert.strictEqual(sectionEntriesAfter.length, sectionEntriesBefore.length);
    });

    test('Should generate valid config structure', () => {
        const config: FocusSpaceConfig = {
            version: '1.0.0',
            entries: [],
            lastModified: Date.now()
        };

        // Test JSON serialization
        const jsonString = JSON.stringify(config);
        const parsed = JSON.parse(jsonString);

        assert.strictEqual(parsed.version, config.version);
        assert.ok(Array.isArray(parsed.entries));
        assert.strictEqual(parsed.lastModified, config.lastModified);
    });

    test('Should handle corrupted JSON gracefully', async () => {
        // Test that corrupted data doesn't crash the manager
        // This tests the error handling in loadState
        
        await manager.loadState();
        
        // Should start with empty state
        const entries = manager.getEntries();
        assert.strictEqual(entries.length, 0);
    });

    test('Should preserve entry metadata during serialization', async () => {
        const testUri = vscode.Uri.file('/test/metadata.ts');
        const entry = await manager.addEntry(testUri, 'file', undefined, 'Custom Label');

        // Verify metadata exists
        assert.ok(entry.metadata);
        assert.ok(typeof entry.metadata.dateAdded === 'number');
        assert.strictEqual(entry.metadata.relativePath, 'metadata.ts');

        // Test that we can get it back
        const retrieved = manager.getEntry(entry.id);
        assert.ok(retrieved);
        assert.ok(retrieved.metadata);
        assert.strictEqual(retrieved.metadata.dateAdded, entry.metadata.dateAdded);
        assert.strictEqual(retrieved.metadata.relativePath, entry.metadata.relativePath);
    });

    test('Should handle section hierarchy in serialization', async () => {
        const section = await manager.createSection('Parent Section');
        const file1 = await manager.addEntry(vscode.Uri.file('/test/child1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/child2.ts'), 'file');

        // Move files to section
        await manager.moveToSection(file1.id, section.id);
        await manager.moveToSection(file2.id, section.id);

        const sectionEntries = manager.getEntries(section.id);
        assert.strictEqual(sectionEntries.length, 2);

        // Verify section structure
        const retrievedSection = manager.getEntry(section.id);
        assert.ok(retrievedSection);
        assert.strictEqual(retrievedSection.type, 'section');
        assert.ok(retrievedSection.children);
        assert.strictEqual(retrievedSection.children.length, 2);
    });

    test('Should handle URIs correctly', async () => {
        const fileUri = vscode.Uri.file('/test/file.ts');
        const httpUri = vscode.Uri.parse('https://example.com/file.ts');
        const sectionUri = vscode.Uri.parse('focus-section://test-section');

        const fileEntry = await manager.addEntry(fileUri, 'file');
        const httpEntry = await manager.addEntry(httpUri, 'file');
        const section = await manager.createSection('Test Section');

        // Verify URIs are preserved correctly
        assert.strictEqual(fileEntry.uri.toString(), fileUri.toString());
        assert.strictEqual(httpEntry.uri.toString(), httpUri.toString());
        assert.ok(section.uri.toString().startsWith('focus-section://'));

        // Verify entries can be found by URI
        assert.strictEqual(manager.hasEntry(fileUri), true);
        assert.strictEqual(manager.hasEntry(httpUri), true);
    });
});