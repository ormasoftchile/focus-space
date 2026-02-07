import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { TreeOperations } from '../../utils/treeOperations';

suite('Edge Case and Stress Tests', () => {
    let manager: FocusSpaceManager;
    let context: vscode.ExtensionContext;

    // Mock extension context
    const createMockContext = () => {
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
        } as unknown as vscode.ExtensionContext;
    };

    suiteSetup(() => {
        context = createMockContext();
        manager = FocusSpaceManager.getInstance(context);
    });

    setup(async () => {
        // Clear state before each test
        await manager.clearAll();
    });

    test('Deep nesting - sections within sections', async () => {
        // Create deeply nested structure
        const level1 = await manager.createSection('Level 1');
        const level2 = await manager.createSection('Level 2');
        const level3 = await manager.createSection('Level 3');
        const level4 = await manager.createSection('Level 4');
        
        // Build hierarchy: L1 > L2 > L3 > L4 > files
        await manager.moveToSection(level2.id, level1.id);
        await manager.moveToSection(level3.id, level2.id);
        await manager.moveToSection(level4.id, level3.id);
        
        // Add files to deepest level
        const file1 = await manager.addEntry(vscode.Uri.file('/test/deep1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/deep2.ts'), 'file');
        await manager.moveToSection(file1.id, level4.id);
        await manager.moveToSection(file2.id, level4.id);
        
        // Verify structure integrity
        const entries = manager.getEntries();
        assert.strictEqual(entries.length, 1); // Only level1 at root
        
        const foundLevel1 = TreeOperations.findById(entries, level1.id);
        assert.ok(foundLevel1);
        assert.strictEqual(foundLevel1.children?.length, 1);
        
        const foundLevel4 = TreeOperations.findById(entries, level4.id);
        assert.ok(foundLevel4);
        assert.strictEqual(foundLevel4.children?.length, 2);
        
        // Test path calculation for deep nesting
        const pathToFile1 = TreeOperations.getPath(entries, file1.id);
        assert.strictEqual(pathToFile1.length, 5); // Root > L1 > L2 > L3 > L4 > file1
    });

    test('Rapid operations stress test', async () => {
        // Perform many rapid operations to test caching and debouncing
        const operations = [];
        
        // Add many entries rapidly
        for (let i = 0; i < 50; i++) {
            operations.push(manager.addEntry(vscode.Uri.file(`/test/rapid-${i}.ts`), 'file'));
        }
        
        const entries = await Promise.all(operations);
        assert.strictEqual(entries.length, 50);
        
        // Now perform rapid section operations
        const section1 = await manager.createSection('Rapid Section 1');
        const section2 = await manager.createSection('Rapid Section 2');
        
        // Move entries rapidly between sections
        for (let i = 0; i < entries.length; i++) {
            const targetSection = i % 2 === 0 ? section1.id : section2.id;
            await manager.moveToSection(entries[i].id, targetSection);
        }
        
        // Verify final state
        const finalEntries = manager.getEntries();
        assert.strictEqual(section1.children?.length, 25);
        assert.strictEqual(section2.children?.length, 25);
    });

    test('Duplicate handling and edge cases', async () => {
        const testUri = vscode.Uri.file('/test/duplicate.ts');
        
        // Add same URI multiple times
        const entry1 = await manager.addEntry(testUri, 'file');
        const entry2 = await manager.addEntry(testUri, 'file');
        const entry3 = await manager.addEntry(testUri, 'file');
        
        // Should create multiple entries (extension allows duplicates for different purposes)
        assert.notStrictEqual(entry1.id, entry2.id);
        assert.notStrictEqual(entry2.id, entry3.id);
        
        const entries = manager.getEntries();
        assert.strictEqual(entries.length, 3);
        
        // All should be findable by URI
        const foundByUri = TreeOperations.findByUri(entries, testUri);
        assert.ok(foundByUri);
    });

    test('Complex removal scenarios', async () => {
        // Create complex hierarchy
        const section1 = await manager.createSection('Main Section');
        const section2 = await manager.createSection('Sub Section');
        const file1 = await manager.addEntry(vscode.Uri.file('/test/remove1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/remove2.ts'), 'file');
        const file3 = await manager.addEntry(vscode.Uri.file('/test/remove3.ts'), 'file');
        
        // Build hierarchy: section1 > section2 > files
        await manager.moveToSection(section2.id, section1.id);
        await manager.moveToSection(file1.id, section2.id);
        await manager.moveToSection(file2.id, section2.id);
        // file3 stays at root
        
        // Remove subsection - should not affect other entries
        const removed = await manager.removeEntry(section2.id);
        assert.strictEqual(removed, true);
        
        const entries = manager.getEntries();
        // Should have: section1 (empty), file3
        assert.strictEqual(entries.length, 2);
        
        // Verify file3 still exists
        const foundFile3 = TreeOperations.findById(entries, file3.id);
        assert.ok(foundFile3);
        
        // Verify section1 is now empty
        const foundSection1 = TreeOperations.findById(entries, section1.id);
        assert.ok(foundSection1);
        assert.strictEqual(foundSection1.children?.length, 0);
    });

    test('Edge cases with empty and malformed data', async () => {
        // Test operations on empty state
        const emptyEntries = manager.getEntries();
        assert.strictEqual(emptyEntries.length, 0);
        
        // Try to find non-existent entries
        const notFound = TreeOperations.findById(emptyEntries, 'non-existent-id');
        assert.strictEqual(notFound, undefined);
        
        const notFoundByUri = TreeOperations.findByUri(emptyEntries, vscode.Uri.file('/non/existent/path'));
        assert.strictEqual(notFoundByUri, undefined);
        
        // Try to remove non-existent entry
        const removeResult = await manager.removeEntry('non-existent-id');
        assert.strictEqual(removeResult, false);
        
        // Try to move non-existent entry
        const moveResult = await manager.moveToSection('non-existent-id', 'also-non-existent');
        assert.strictEqual(moveResult, false);
    });

    test('Tree operations consistency under concurrent modifications', async () => {
        // Create initial structure
        const section = await manager.createSection('Concurrent Section');
        const files = [];
        
        for (let i = 0; i < 10; i++) {
            const file = await manager.addEntry(vscode.Uri.file(`/test/concurrent-${i}.ts`), 'file');
            files.push(file);
            await manager.moveToSection(file.id, section.id);
        }
        
        // Verify initial state
        let entries = manager.getEntries();
        assert.strictEqual(section.children?.length, 10);
        
        // Perform concurrent-like operations (serialized but rapid)
        for (let i = 0; i < 5; i++) {
            // Remove and re-add entries
            await manager.removeEntry(files[i].id);
            const newFile = await manager.addEntry(vscode.Uri.file(`/test/new-concurrent-${i}.ts`), 'file');
            await manager.moveToSection(newFile.id, section.id);
        }
        
        // Verify final consistency
        entries = manager.getEntries();
        const finalSection = TreeOperations.findById(entries, section.id);
        assert.ok(finalSection);
        assert.strictEqual(finalSection.children?.length, 10); // Still 10 files, but some replaced
        
        // Verify tree structure integrity
        const flattened = TreeOperations.flatten(entries);
        assert.strictEqual(flattened.length, 11); // 1 section + 10 files
    });

    test('Performance with very large trees', async () => {
        // Create a large tree structure
        const sections = [];
        const filesPerSection = 20;
        
        // Create 10 sections with 20 files each
        for (let s = 0; s < 10; s++) {
            const section = await manager.createSection(`Large Section ${s}`);
            sections.push(section);
            
            for (let f = 0; f < filesPerSection; f++) {
                const file = await manager.addEntry(
                    vscode.Uri.file(`/test/large-tree/section-${s}/file-${f}.ts`), 
                    'file'
                );
                await manager.moveToSection(file.id, section.id);
            }
        }
        
        // Test operations on large tree
        const startTime = performance.now();
        
        const entries = manager.getEntries();
        assert.strictEqual(entries.length, 10); // 10 sections at root
        
        // Count total entries
        const totalCount = TreeOperations.count(entries);
        assert.strictEqual(totalCount, 210); // 10 sections + 200 files
        
        // Test search performance
        const firstSection = sections[0];
        const found = TreeOperations.findById(entries, firstSection.id);
        assert.ok(found);
        assert.strictEqual(found.children?.length, filesPerSection);
        
        // Test flatten performance
        const flattened = TreeOperations.flatten(entries);
        assert.strictEqual(flattened.length, 210);
        
        const endTime = performance.now();
        console.log(`Large tree operations took: ${endTime - startTime}ms`);
        
        // Should complete within reasonable time (< 100ms)
        assert.ok(endTime - startTime < 100, 'Large tree operations should be fast');
    });
});