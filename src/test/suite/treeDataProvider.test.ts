import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceTreeDataProvider } from '../../providers/focusSpaceTreeDataProvider';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { FocusEntry } from '../../models/focusEntry';

suite('FocusSpaceTreeDataProvider Tests', () => {
    let manager: FocusSpaceManager;
    let treeProvider: FocusSpaceTreeDataProvider;
    let mockContext: vscode.ExtensionContext;

    setup(() => {
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
        treeProvider = new FocusSpaceTreeDataProvider(manager);
    });

    teardown(async () => {
        await manager.clearAll();
    });

    test('Should create tree provider instance', () => {
        assert.ok(treeProvider);
        assert.ok(treeProvider.onDidChangeTreeData);
    });

    test('Should return empty array for root when no entries', async () => {
        const children = await treeProvider.getChildren();
        assert.strictEqual(children.length, 0);
    });

    test('Should return top-level entries for root', async () => {
        // Add test entries
        const fileUri = vscode.Uri.file('/test/file.ts');
        const folderUri = vscode.Uri.file('/test/folder');
        
        await manager.addEntry(fileUri, 'file');
        await manager.addEntry(folderUri, 'folder');
        
        const children = await treeProvider.getChildren();
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].type, 'file');
        assert.strictEqual(children[1].type, 'folder');
    });

    test('Should return section children when element is section', async () => {
        // Create section with children
        const section = await manager.createSection('Test Section');
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        
        // Move file to section
        await manager.moveToSection(fileEntry.id, section.id);
        
        const children = await treeProvider.getChildren(section);
        assert.strictEqual(children.length, 1);
        assert.strictEqual(children[0].id, fileEntry.id);
    });

    test('Should return empty array for files and folders', async () => {
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        
        const children = await treeProvider.getChildren(fileEntry);
        assert.strictEqual(children.length, 0);
    });

    test('Should create proper TreeItem for file', async () => {
        const fileUri = vscode.Uri.file('/test/sample.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        
        const treeItem = treeProvider.getTreeItem(fileEntry);
        
        assert.strictEqual(treeItem.label, 'sample.ts');
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
        assert.strictEqual(treeItem.resourceUri?.toString(), fileUri.toString());
        assert.strictEqual(treeItem.contextValue, 'file');
        assert.ok(treeItem.command);
        assert.strictEqual(treeItem.command.command, 'vscode.open');
    });

    test('Should create proper TreeItem for folder', async () => {
        const folderUri = vscode.Uri.file('/test/folder');
        const folderEntry = await manager.addEntry(folderUri, 'folder');
        
        const treeItem = treeProvider.getTreeItem(folderEntry);
        
        assert.strictEqual(treeItem.label, 'folder');
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        assert.strictEqual(treeItem.resourceUri?.toString(), folderUri.toString());
        assert.strictEqual(treeItem.contextValue, 'folder');
        assert.strictEqual(treeItem.command, undefined);
    });

    test('Should create proper TreeItem for section', async () => {
        const section = await manager.createSection('Test Section');
        
        const treeItem = treeProvider.getTreeItem(section);
        
        assert.strictEqual(treeItem.label, 'Test Section');
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
        assert.strictEqual(treeItem.resourceUri, undefined);
        assert.strictEqual(treeItem.contextValue, 'section');
        assert.strictEqual(treeItem.command, undefined);
    });

    test('Should use filename as label when no custom label provided', async () => {
        const fileUri = vscode.Uri.file('/long/path/to/myfile.js');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        
        const treeItem = treeProvider.getTreeItem(fileEntry);
        assert.strictEqual(treeItem.label, 'myfile.js');
    });

    test('Should use custom label when provided', async () => {
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file', undefined, 'Custom Label');
        
        const treeItem = treeProvider.getTreeItem(fileEntry);
        assert.strictEqual(treeItem.label, 'Custom Label');
    });

    test('Should set appropriate icons', async () => {
        const fileUri = vscode.Uri.file('/test/file.ts');
        const folderUri = vscode.Uri.file('/test/folder');
        
        const fileEntry = await manager.addEntry(fileUri, 'file');
        const folderEntry = await manager.addEntry(folderUri, 'folder');
        const section = await manager.createSection('Section');
        
        const fileItem = treeProvider.getTreeItem(fileEntry);
        const folderItem = treeProvider.getTreeItem(folderEntry);
        const sectionItem = treeProvider.getTreeItem(section);
        
        assert.strictEqual((fileItem.iconPath as vscode.ThemeIcon).id, 'file');
        assert.strictEqual((folderItem.iconPath as vscode.ThemeIcon).id, 'folder');
        assert.strictEqual((sectionItem.iconPath as vscode.ThemeIcon).id, 'target');
    });

    test('Should include tooltip with metadata', async () => {
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        
        const treeItem = treeProvider.getTreeItem(fileEntry);
        
        assert.ok(treeItem.tooltip);
        assert.ok((treeItem.tooltip as string).includes('Added:'));
    });

    test('Should find parent of child in section', async () => {
        const section = await manager.createSection('Parent Section');
        const fileUri = vscode.Uri.file('/test/child.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        
        await manager.moveToSection(fileEntry.id, section.id);
        
        const parent = treeProvider.getParent(fileEntry) as FocusEntry;
        assert.ok(parent);
        assert.strictEqual(parent.id, section.id);
    });

    test('Should return undefined parent for top-level entry', async () => {
        const fileUri = vscode.Uri.file('/test/file.ts');
        const fileEntry = await manager.addEntry(fileUri, 'file');
        
        const parent = treeProvider.getParent(fileEntry) as FocusEntry | undefined;
        assert.strictEqual(parent, undefined);
    });

    test('Should handle refresh method', () => {
        // This test mainly ensures the method exists and doesn't throw
        assert.doesNotThrow(() => {
            treeProvider.refresh();
        });
    });

    test('Should use fallback labels correctly', async () => {
        // Test section without custom label
        const dummyUri = vscode.Uri.file('/dummy');
        const section: FocusEntry = {
            id: 'test-section',
            uri: dummyUri,
            type: 'section',
            children: []
        };
        
        const treeItem = treeProvider.getTreeItem(section);
        assert.strictEqual(treeItem.label, 'Untitled Section');
    });
});