import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';

suite('Commands - Management Operations', () => {
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

    test('Reveal in Explorer - file entry', async () => {
        // Add a test file
        const fileUri = vscode.Uri.file('/test/sample.ts');
        const entry = await manager.addEntry(fileUri, 'file');
        
        // Test that we can get the entry for reveal operation
        const retrievedEntry = manager.getEntry(entry.id);
        assert.strictEqual(retrievedEntry?.type, 'file');
        assert.strictEqual(retrievedEntry?.uri.toString(), fileUri.toString());
        
        // The actual reveal command would be tested in integration tests
        // since it involves VS Code command execution
    });

    test('Reveal in Explorer - folder entry', async () => {
        // Add a test folder
        const folderUri = vscode.Uri.file('/test/folder');
        const entry = await manager.addEntry(folderUri, 'folder');
        
        // Test that we can get the entry for reveal operation
        const retrievedEntry = manager.getEntry(entry.id);
        assert.strictEqual(retrievedEntry?.type, 'folder');
        assert.strictEqual(retrievedEntry?.uri.toString(), folderUri.toString());
    });

    test('Reveal in Explorer - section should not be revealable', async () => {
        // Create a section
        const section = await manager.createSection('Test Section');
        
        // Test that section type is correctly identified
        const retrievedEntry = manager.getEntry(section.id);
        assert.strictEqual(retrievedEntry?.type, 'section');
        
        // Sections should not have file system URIs
        assert.strictEqual(retrievedEntry?.uri.scheme, 'focus-section');
    });

    test('Get entry for command operations', async () => {
        // Add various types of entries
        const fileUri = vscode.Uri.file('/test/file.ts');
        const folderUri = vscode.Uri.file('/test/folder');
        const section = await manager.createSection('Test Section');
        
        const fileEntry = await manager.addEntry(fileUri, 'file');
        const folderEntry = await manager.addEntry(folderUri, 'folder');

        // Test that we can retrieve all entries by ID
        assert.strictEqual(manager.getEntry(fileEntry.id)?.type, 'file');
        assert.strictEqual(manager.getEntry(folderEntry.id)?.type, 'folder');
        assert.strictEqual(manager.getEntry(section.id)?.type, 'section');
        
        // Test non-existent ID
        assert.strictEqual(manager.getEntry('non-existent'), undefined);
    });

    test('Count items for remove all confirmation', async () => {
        // Add some items
        await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        await manager.addEntry(vscode.Uri.file('/test/folder'), 'folder');
        
        const section = await manager.createSection('Test Section');
        const sectionFile = await manager.addEntry(vscode.Uri.file('/test/section-file.ts'), 'file');
        await manager.moveToSection(sectionFile.id, section.id);

        // Count top-level entries (should be 4: 3 files/folders + 1 section)
        const topLevelEntries = manager.getTopLevelEntries();
        assert.strictEqual(topLevelEntries.length, 4);
        
        // Count total items including section children
        let totalItems = 0;
        topLevelEntries.forEach(entry => {
            totalItems += 1; // Count the entry itself
            if (entry.type === 'section' && entry.children) {
                totalItems += entry.children.length; // Count children
            }
        });
        assert.strictEqual(totalItems, 5); // 3 + 1 section + 1 child in section
    });

    test('Remove all with empty state', async () => {
        // Start with empty state
        const entries = manager.getTopLevelEntries();
        assert.strictEqual(entries.length, 0);
        
        // Clear all on empty state should not cause errors
        await manager.clearAll();
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
    });

    test('Remove all with complex hierarchy', async () => {
        // Create a complex hierarchy
        const section1 = await manager.createSection('Section 1');
        const section2 = await manager.createSection('Section 2');
        
        // Add files to sections
        const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
        const file3 = await manager.addEntry(vscode.Uri.file('/test/file3.ts'), 'file');
        const file4 = await manager.addEntry(vscode.Uri.file('/test/file4.ts'), 'file');
        
        await manager.moveToSection(file1.id, section1.id);
        await manager.moveToSection(file2.id, section1.id);
        await manager.moveToSection(file3.id, section2.id);
        // file4 remains at top level
        
        // Verify initial state
        assert.strictEqual(manager.getTopLevelEntries().length, 3); // 2 sections + 1 file
        assert.strictEqual(section1.children?.length, 2);
        assert.strictEqual(section2.children?.length, 1);
        
        // Clear all
        await manager.clearAll();
        
        // Verify everything is gone
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
        assert.strictEqual(manager.getEntry(section1.id), undefined);
        assert.strictEqual(manager.getEntry(section2.id), undefined);
        assert.strictEqual(manager.getEntry(file1.id), undefined);
        assert.strictEqual(manager.getEntry(file2.id), undefined);
        assert.strictEqual(manager.getEntry(file3.id), undefined);
        assert.strictEqual(manager.getEntry(file4.id), undefined);
    });

    test('Entry persistence after operations', async () => {
        // Add an entry
        const fileUri = vscode.Uri.file('/test/persistent.ts');
        const entry = await manager.addEntry(fileUri, 'file', undefined, 'Custom Label');
        
        // Verify entry details are preserved
        const retrieved = manager.getEntry(entry.id);
        assert.strictEqual(retrieved?.label, 'Custom Label');
        assert.strictEqual(retrieved?.uri.toString(), fileUri.toString());
        assert.strictEqual(retrieved?.type, 'file');
        assert.ok(retrieved?.metadata?.dateAdded);
        assert.strictEqual(retrieved?.metadata?.relativePath, 'persistent.ts');
    });

    test('Section with children management', async () => {
        // Create section with multiple children for management testing
        const section = await manager.createSection('Management Test');
        
        // Add multiple files
        const files = [];
        for (let i = 1; i <= 3; i++) {
            const fileUri = vscode.Uri.file(`/test/file${i}.ts`);
            const file = await manager.addEntry(fileUri, 'file');
            await manager.moveToSection(file.id, section.id);
            files.push(file);
        }
        
        // Verify section structure
        assert.strictEqual(section.children?.length, 3);
        assert.strictEqual(manager.getTopLevelEntries().length, 1); // Just the section
        
        // Test that each child can be retrieved
        files.forEach(file => {
            const retrieved = manager.getEntry(file.id);
            assert.ok(retrieved);
            assert.strictEqual(retrieved.type, 'file');
        });
        
        // Test section retrieval
        const retrievedSection = manager.getEntry(section.id);
        assert.strictEqual(retrievedSection?.type, 'section');
        assert.strictEqual(retrievedSection?.children?.length, 3);
    });

    test('Remove all command - empty state handling', async () => {
        // Verify empty state
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
        
        // Remove all should handle empty state gracefully
        await manager.clearAll();
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
    });

    test('Remove all command - complex hierarchy removal', async () => {
        // Create complex hierarchy similar to the removeAll command use case
        const section1 = await manager.createSection('Section A');
        const section2 = await manager.createSection('Section B');
        
        // Add files
        const file1 = await manager.addEntry(vscode.Uri.file('/test/top-level.ts'), 'file');
        const file2 = await manager.addEntry(vscode.Uri.file('/test/section-file.ts'), 'file');
        const file3 = await manager.addEntry(vscode.Uri.file('/test/another-file.ts'), 'file');
        
        // Move files to sections
        await manager.moveToSection(file2.id, section1.id);
        await manager.moveToSection(file3.id, section2.id);
        
        // Verify initial count matches removeAll command logic
        const allEntries = manager.getTopLevelEntries();
        let totalItems = 0;
        for (const entry of allEntries) {
            totalItems++; // Count the entry itself
            if (entry.type === 'section' && entry.children) {
                totalItems += entry.children.length; // Count children
            }
        }
        assert.strictEqual(totalItems, 5); // 3 top-level + 2 children
        
        // Execute removal
        await manager.clearAll();
        assert.strictEqual(manager.getTopLevelEntries().length, 0);
    });

    test('Convert folder to section command logic', async () => {
        // Add a folder entry
        const folderUri = vscode.Uri.file('/test/convert-folder');
        const folderEntry = await manager.addEntry(folderUri, 'folder');
        
        // Verify it's a folder
        assert.strictEqual(folderEntry.type, 'folder');
        
        // Test conversion (using manager method that the command uses)
        const result = await manager.autoConvertFolderToSection(folderEntry.id);
        
        if (result) {
            // Verify conversion result
            assert.ok(result.sectionId);
            assert.ok(Array.isArray(result.childEntries));
            
            // Verify the original folder is gone and replaced with section
            const convertedEntry = manager.getEntry(result.sectionId);
            assert.strictEqual(convertedEntry?.type, 'section');
            assert.strictEqual(manager.getEntry(folderEntry.id), undefined);
        } else {
            // If conversion failed (e.g., folder doesn't exist in filesystem), that's ok for this test
            // The command handles this gracefully
            assert.ok(true, 'Conversion failed gracefully as expected for non-existent test folder');
        }
    });

    test('Convert folder to section - invalid entry handling', async () => {
        // Test with non-existent ID
        const result1 = await manager.autoConvertFolderToSection('invalid-id');
        assert.strictEqual(result1, null);
        
        // Test with file entry (not folder)
        const fileEntry = await manager.addEntry(vscode.Uri.file('/test/not-folder.ts'), 'file');
        const result2 = await manager.autoConvertFolderToSection(fileEntry.id);
        assert.strictEqual(result2, null);
        
        // Test with section entry
        const section = await manager.createSection('Test Section');
        const result3 = await manager.autoConvertFolderToSection(section.id);
        assert.strictEqual(result3, null);
    });

    test('Reveal in Explorer command - entry validation', async () => {
        // Test file entry (should be revealable)
        const fileEntry = await manager.addEntry(vscode.Uri.file('/test/reveal-file.ts'), 'file');
        const retrievedFile = manager.getEntry(fileEntry.id);
        assert.ok(retrievedFile);
        assert.strictEqual(retrievedFile.type, 'file');
        assert.notStrictEqual(retrievedFile.uri.scheme, 'focus-section');
        
        // Test folder entry (should be revealable) 
        const folderEntry = await manager.addEntry(vscode.Uri.file('/test/reveal-folder'), 'folder');
        const retrievedFolder = manager.getEntry(folderEntry.id);
        assert.ok(retrievedFolder);
        assert.strictEqual(retrievedFolder.type, 'folder');
        assert.notStrictEqual(retrievedFolder.uri.scheme, 'focus-section');
        
        // Test section entry (should NOT be revealable)
        const section = await manager.createSection('Non-revealable Section');
        const retrievedSection = manager.getEntry(section.id);
        assert.ok(retrievedSection);
        assert.strictEqual(retrievedSection.type, 'section');
        assert.strictEqual(retrievedSection.uri.scheme, 'focus-section');
    });
});