import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { TreeOperations } from '../../utils/treeOperations';
import { FocusEntry } from '../../models/focusEntry';

suite('Reorder Operations Test Suite', () => {
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
    });

    teardown(async () => {
        await manager.clearAll();
    });

    test('should reorder entries at root level', async () => {
        // Create test entries
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        const file3 = await manager.addEntry(vscode.Uri.file('/test/file3.ts'), 'file');

        // Initial order should be [file1, file2, file3]
        let entries = manager.getTopLevelEntries();
        assert.strictEqual(entries[0].id, file1.id);
        assert.strictEqual(entries[1].id, file2.id);
        assert.strictEqual(entries[2].id, file3.id);

        // Move file1 to position 2 (between file2 and file3)
        const reordered = await manager.reorderEntry(file1.id, 2);
        assert.strictEqual(reordered, true);

        // New order should be [file2, file3, file1]
        entries = manager.getTopLevelEntries();
        assert.strictEqual(entries[0].id, file2.id);
        assert.strictEqual(entries[1].id, file3.id);
        assert.strictEqual(entries[2].id, file1.id);
    });

    test('should reorder entries within a section', async () => {
        // Create a section with entries
        const section = await manager.createSection('Test Section');
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        const file3 = await manager.addEntry(vscode.Uri.file('/test/file3.ts'), 'file');

        // Move files to section
        await manager.moveToSection(file1.id, section.id);
        await manager.moveToSection(file2.id, section.id);
        await manager.moveToSection(file3.id, section.id);

        // Initial order in section should be [file1, file2, file3]
        let sectionEntries = manager.getEntries(section.id);
        assert.strictEqual(sectionEntries[0].id, file1.id);
        assert.strictEqual(sectionEntries[1].id, file2.id);
        assert.strictEqual(sectionEntries[2].id, file3.id);

        // Move file3 to position 0 (first)
        const reordered = await manager.reorderEntry(file3.id, 0, section.id);
        assert.strictEqual(reordered, true);

        // New order should be [file3, file1, file2]
        sectionEntries = manager.getEntries(section.id);
        assert.strictEqual(sectionEntries[0].id, file3.id);
        assert.strictEqual(sectionEntries[1].id, file1.id);
        assert.strictEqual(sectionEntries[2].id, file2.id);
    });

    test('should handle invalid reorder operations', async () => {
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');

        // Try to reorder non-existent entry
        const result1 = await manager.reorderEntry('non-existent', 0);
        assert.strictEqual(result1, false);

        // Try to reorder within non-existent parent
        const result2 = await manager.reorderEntry(file1.id, 0, 'non-existent-parent');
        assert.strictEqual(result2, false);
    });

    test('should handle position clamping', async () => {
        // Create test entries
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');

        // Move to position way beyond array length (should clamp to end)
        const reordered = await manager.reorderEntry(file1.id, 999);
        assert.strictEqual(reordered, true);

        // file1 should be at the end
        const entries = manager.getTopLevelEntries();
        assert.strictEqual(entries[entries.length - 1].id, file1.id);
    });

    test('should handle move with position control', async () => {
        // Create setup
        const section1 = await manager.createSection('Section 1');
        const section2 = await manager.createSection('Section 2');
        
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        const file3 = await manager.addEntry(vscode.Uri.file('/test/file3.ts'), 'file');

        // Move files to section1
        await manager.moveToSection(file1.id, section1.id);
        await manager.moveToSection(file2.id, section1.id);

        // Move file3 to section2
        await manager.moveToSection(file3.id, section2.id);

        // Now move file2 to section2 at position 0 (before file3)
        const moved = await manager.moveToSectionWithPosition(file2.id, section2.id, 0);
        assert.strictEqual(moved, true);

        // Check section2 order: [file2, file3]
        const section2Entries = manager.getEntries(section2.id);
        assert.strictEqual(section2Entries.length, 2);
        assert.strictEqual(section2Entries[0].id, file2.id);
        assert.strictEqual(section2Entries[1].id, file3.id);

        // Check section1 only has file1
        const section1Entries = manager.getEntries(section1.id);
        assert.strictEqual(section1Entries.length, 1);
        assert.strictEqual(section1Entries[0].id, file1.id);
    });

    test('TreeOperations.reorderEntry should work correctly', () => {
        // Create test data structure
        const entries: FocusEntry[] = [
            {
                id: '1',
                uri: vscode.Uri.file('/test/file1.ts'),
                type: 'file',
                metadata: { dateAdded: Date.now() }
            },
            {
                id: '2',
                uri: vscode.Uri.file('/test/file2.ts'),
                type: 'file',
                metadata: { dateAdded: Date.now() }
            },
            {
                id: '3',
                uri: vscode.Uri.file('/test/file3.ts'),
                type: 'file',
                metadata: { dateAdded: Date.now() }
            }
        ];

        // Initial order: [1, 2, 3]
        assert.strictEqual(entries[0].id, '1');
        assert.strictEqual(entries[1].id, '2');
        assert.strictEqual(entries[2].id, '3');

        // Move entry '1' to position 2
        const result = TreeOperations.reorderEntry(entries, '1', 2);
        assert.strictEqual(result, true);

        // New order: [2, 3, 1]
        assert.strictEqual(entries[0].id, '2');
        assert.strictEqual(entries[1].id, '3');
        assert.strictEqual(entries[2].id, '1');
    });

    test('TreeOperations.moveEntryWithPosition should work correctly', () => {
        // Create test data structure with section
        const entries: FocusEntry[] = [
            {
                id: 'file1',
                uri: vscode.Uri.file('/test/file1.ts'),
                type: 'file',
                metadata: { dateAdded: Date.now() }
            },
            {
                id: 'section1',
                uri: vscode.Uri.file('/test/section'),
                type: 'section',
                label: 'Test Section',
                children: [
                    {
                        id: 'file2',
                        uri: vscode.Uri.file('/test/file2.ts'),
                        type: 'file',
                        metadata: { dateAdded: Date.now() }
                    }
                ],
                metadata: { dateAdded: Date.now() }
            }
        ];

        // Move file1 to section1 at position 0 (before file2)
        const result = TreeOperations.moveEntryWithPosition(entries, 'file1', 'section1', 0);
        assert.strictEqual(result, true);

        // Check results
        const section = entries.find(e => e.id === 'section1');
        assert.ok(section);
        assert.ok(section.children);
        assert.strictEqual(section.children.length, 2);
        assert.strictEqual(section.children[0].id, 'file1'); // moved to position 0
        assert.strictEqual(section.children[1].id, 'file2'); // original file2 pushed to position 1

        // Check root level no longer has file1
        const rootFile1 = entries.find(e => e.id === 'file1');
        assert.strictEqual(rootFile1, undefined);
    });
});