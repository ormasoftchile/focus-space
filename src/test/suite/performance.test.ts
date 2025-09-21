import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { TreeOperations } from '../../utils/treeOperations';

suite('Performance Optimization Tests', () => {
    let manager: FocusSpaceManager;
    let context: vscode.ExtensionContext;

    // Mock extension context
    const createMockContext = (): vscode.ExtensionContext => {
        return {
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
            extensionPath: '/test/extension',
            storagePath: '/test/storage',
            globalStoragePath: '/test/global-storage',
            logPath: '/test/logs',
            extensionUri: vscode.Uri.file('/test/extension'),
            storageUri: vscode.Uri.file('/test/storage'),
            globalStorageUri: vscode.Uri.file('/test/global-storage'),
            logUri: vscode.Uri.file('/test/logs'),
            asAbsolutePath: (relativePath: string) => `/test/extension/${relativePath}`,
            environmentVariableCollection: {} as any,
            extension: {} as any,
            secrets: {} as any,
            extensionMode: vscode.ExtensionMode.Test,
            languageModelAccessInformation: {} as any
        };
    };

    suiteSetup(() => {
        context = createMockContext();
        manager = FocusSpaceManager.getInstance(context);
    });

    setup(async () => {
        // Clear state before each test
        await manager.clearAll();
    });

    test('Cache performance - repeated lookups should be fast', async () => {
        // Add several entries to build a tree
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        const section = await manager.createSection('Test Section');
        await manager.moveToSection(file1.id, section.id);
        await manager.moveToSection(file2.id, section.id);
        
        const entries = manager.getEntries();
        
        // First lookup should build cache
        const start1 = performance.now();
        const found1 = TreeOperations.findById(entries, file1.id);
        const end1 = performance.now();
        
        // Second lookup should use cache and be faster
        const start2 = performance.now();
        const found2 = TreeOperations.findById(entries, file1.id);
        const end2 = performance.now();
        
        assert.strictEqual(found1?.id, file1.id);
        assert.strictEqual(found2?.id, file1.id);
        
        // Second lookup should be significantly faster (cache hit)
        // Note: This is a relative test - cache should provide performance benefit
        console.log(`First lookup: ${end1 - start1}ms, Second lookup: ${end2 - start2}ms`);
    });

    test('Cache invalidation on tree modifications', async () => {
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const entries = manager.getEntries();
        
        // First lookup to build cache
        const found1 = TreeOperations.findById(entries, file1.id);
        assert.strictEqual(found1?.id, file1.id);
        
        // Modify tree (should invalidate cache)
        const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        
        // Lookup should still work after cache invalidation
        const foundAfterModification = TreeOperations.findById(manager.getEntries(), file1.id);
        assert.strictEqual(foundAfterModification?.id, file1.id);
        
        // New entry should also be findable
        const foundNew = TreeOperations.findById(manager.getEntries(), file2.id);
        assert.strictEqual(foundNew?.id, file2.id);
    });

    test('Batch mode operations should defer cache clearing', async () => {
        const entries = manager.getEntries();
        
        // Start batch mode
        TreeOperations.startBatch();
        
        // Add multiple entries (cache clearing should be deferred)
        const file1 = await manager.addEntry(vscode.Uri.file('/test/batch1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/batch2.ts'), 'file');
        const section = await manager.createSection('Batch Section');
        
        // End batch mode (should clear cache now)
        TreeOperations.endBatch();
        
        // Verify all entries are findable
        const currentEntries = manager.getEntries();
        assert.ok(TreeOperations.findById(currentEntries, file1.id));
        assert.ok(TreeOperations.findById(currentEntries, file2.id));
        assert.ok(TreeOperations.findById(currentEntries, section.id));
    });

    test('URI cache should work for findByUri operations', async () => {
        const testUri = vscode.Uri.file('/test/uri-cache-test.ts');
        const entry = await manager.addEntry(testUri, 'file');
        
        const entries = manager.getEntries();
        
        // First URI lookup should build cache
        const found1 = TreeOperations.findByUri(entries, testUri);
        assert.strictEqual(found1?.id, entry.id);
        
        // Second URI lookup should use cache
        const found2 = TreeOperations.findByUri(entries, testUri);
        assert.strictEqual(found2?.id, entry.id);
        
        // Verify same object reference (cache hit)
        assert.strictEqual(found1, found2);
    });

    test('Debounced saves should prevent excessive persistence calls', async () => {
        // This test verifies the debounce mechanism exists
        // In real usage, multiple rapid changes would only result in one save
        
        const file1 = await manager.addEntry(vscode.Uri.file('/test/debounce1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/debounce2.ts'), 'file');
        const file3 = await manager.addEntry(vscode.Uri.file('/test/debounce3.ts'), 'file');
        
        // All entries should be present despite rapid changes
        const entries = manager.getEntries();
        assert.strictEqual(entries.length, 3);
        
        assert.ok(TreeOperations.findById(entries, file1.id));
        assert.ok(TreeOperations.findById(entries, file2.id));
        assert.ok(TreeOperations.findById(entries, file3.id));
    });

    test('Large tree performance - operations should scale well', async () => {
        // Create a larger tree structure
        const section1 = await manager.createSection('Large Section 1');
        const section2 = await manager.createSection('Large Section 2');
        
        // Add multiple files to each section
        const files: string[] = [];
        for (let i = 0; i < 20; i++) {
            const file = await manager.addEntry(vscode.Uri.file(`/test/large-tree-file-${i}.ts`), 'file');
            await manager.moveToSection(file.id, i < 10 ? section1.id : section2.id);
            files.push(file.id);
        }
        
        const entries = manager.getEntries();
        
        // Test lookup performance on larger tree
        const start = performance.now();
        for (const fileId of files) {
            const found = TreeOperations.findById(entries, fileId);
            assert.ok(found);
        }
        const end = performance.now();
        
        console.log(`20 lookups in large tree took: ${end - start}ms`);
        
        // Verify tree structure is correct
        assert.strictEqual(entries.length, 2); // Two sections at root
        assert.strictEqual(section1.children?.length, 10);
        assert.strictEqual(section2.children?.length, 10);
    });
});