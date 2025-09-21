import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { FocusSpaceTreeDataProvider } from '../../providers/focusSpaceTreeDataProvider';

/**
 * Test suite for TreeDataProvider Active File Highlighting
 * Tests visual highlighting of active files in the tree view
 */
suite('TreeDataProvider Active File Highlighting', () => {
    let manager: FocusSpaceManager;
    let treeProvider: FocusSpaceTreeDataProvider;
    let sandbox: sinon.SinonSandbox;
    let extensionContext: vscode.ExtensionContext;

    // Helper function to safely extract string from description/tooltip
    function getStringValue(value: string | boolean | vscode.MarkdownString | undefined): string {
        if (typeof value === 'string') {
            return value;
        }
        if (value && typeof value === 'object' && 'value' in value) {
            return value.value;
        }
        return '';
    }

    setup(async function() {
        this.timeout(10000);
        
        sandbox = sinon.createSandbox();
        
        // Create mock extension context
        extensionContext = {
            subscriptions: [],
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub().resolves()
            },
            globalState: {
                get: sinon.stub(),
                update: sinon.stub().resolves()
            }
        } as any;

        // Initialize manager and tree provider
        manager = FocusSpaceManager.getInstance(extensionContext);
        await manager.clearAll();
        treeProvider = new FocusSpaceTreeDataProvider(manager);
    });

    teardown(async () => {
        await manager.clearAll();
        sandbox.restore();
    });

    test('Should create normal TreeItem for non-active file', async () => {
        const testUri = vscode.Uri.file('/test/normal-file.ts');
        const entry = await manager.addEntry(testUri, 'file');
        
        const treeItem = treeProvider.getTreeItem(entry);
        
        assert.ok(treeItem, 'Should create TreeItem');
        assert.strictEqual(treeItem.resourceUri?.toString(), testUri.toString(), 'Should set correct resource URI');
        assert.strictEqual(treeItem.contextValue, 'file', 'Should set correct context value');
        
        // Should not have active file indicators
        const descriptionStr = getStringValue(treeItem.description);
        const tooltipStr = getStringValue(treeItem.tooltip);
        assert.ok(!descriptionStr.includes('● active'), 'Should not have active indicator in description');
        assert.ok(!tooltipStr.includes('● Currently Active'), 'Should not have active indicator in tooltip');
    });

    test('Should create highlighted TreeItem for active file', async () => {
        const testUri = vscode.Uri.file('/test/active-file.ts');
        const entry = await manager.addEntry(testUri, 'file');
        
        // Simulate this file being active by setting it in the tree provider
        // Note: In real usage, this would be set by the ActiveEditorTracker
        (treeProvider as any).activeFileUri = testUri;
        
        const treeItem = treeProvider.getTreeItem(entry);
        
        assert.ok(treeItem, 'Should create TreeItem');
        assert.strictEqual(treeItem.resourceUri?.toString(), testUri.toString(), 'Should set correct resource URI');
        
        // Should have active file indicators
        const descriptionStr = getStringValue(treeItem.description);
        const tooltipStr = getStringValue(treeItem.tooltip);
        assert.ok(descriptionStr.includes('● active'), 'Should have active indicator in description');
        assert.ok(tooltipStr.includes('● Currently Active'), 'Should have active indicator in tooltip');
        
        // Should have special icon for active file
        assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon, 'Should use ThemeIcon for active file');
        if (treeItem.iconPath instanceof vscode.ThemeIcon) {
            assert.strictEqual(treeItem.iconPath.id, 'circle-filled', 'Should use circle-filled icon for active file');
        }
    });

    test('Should not highlight sections as active', async () => {
        const section = await manager.createSection('Test Section');
        const testUri = vscode.Uri.file('/test/some-file.ts');
        
        // Simulate some file being active
        (treeProvider as any).activeFileUri = testUri;
        
        const treeItem = treeProvider.getTreeItem(section);
        
        // Section should not be highlighted even if some other file is active
        const descriptionStr = getStringValue(treeItem.description);
        const tooltipStr = getStringValue(treeItem.tooltip);
        assert.ok(!descriptionStr.includes('● active'), 'Section should not have active indicator in description');
        assert.ok(!tooltipStr.includes('● Currently Active'), 'Section should not have active indicator in tooltip');
    });

    test('Should handle TreeItem creation with metadata for active files', async () => {
        const testUri = vscode.Uri.file('/test/metadata-file.ts');
        const entry = await manager.addEntry(testUri, 'file');
        
        // Ensure entry has metadata
        assert.ok(entry.metadata, 'Entry should have metadata');
        
        // Simulate this file being active
        (treeProvider as any).activeFileUri = testUri;
        
        const treeItem = treeProvider.getTreeItem(entry);
        
        // Should have active indicators AND metadata in tooltip
        const tooltipStr = getStringValue(treeItem.tooltip);
        assert.ok(tooltipStr.includes('● Currently Active'), 'Should have active indicator in tooltip');
        assert.ok(!tooltipStr.includes('Added:'), 'Active files should not show metadata date in tooltip');
    });

    test('Should update highlighting when active file changes', async () => {
        const file1Uri = vscode.Uri.file('/test/file1.ts');
        const file2Uri = vscode.Uri.file('/test/file2.ts');
        
        const entry1 = await manager.addEntry(file1Uri, 'file');
        const entry2 = await manager.addEntry(file2Uri, 'file');
        
        // Initially no active file
        let treeItem1 = treeProvider.getTreeItem(entry1);
        let treeItem2 = treeProvider.getTreeItem(entry2);
        
        let desc1 = getStringValue(treeItem1.description);
        let desc2 = getStringValue(treeItem2.description);
        assert.ok(!desc1.includes('● active'), 'File1 should not be active initially');
        assert.ok(!desc2.includes('● active'), 'File2 should not be active initially');
        
        // Set file1 as active
        (treeProvider as any).activeFileUri = file1Uri;
        
        treeItem1 = treeProvider.getTreeItem(entry1);
        treeItem2 = treeProvider.getTreeItem(entry2);
        
        desc1 = getStringValue(treeItem1.description);
        desc2 = getStringValue(treeItem2.description);
        assert.ok(desc1.includes('● active'), 'File1 should be active');
        assert.ok(!desc2.includes('● active'), 'File2 should not be active');
        
        // Switch to file2 as active
        (treeProvider as any).activeFileUri = file2Uri;
        
        treeItem1 = treeProvider.getTreeItem(entry1);
        treeItem2 = treeProvider.getTreeItem(entry2);
        
        desc1 = getStringValue(treeItem1.description);
        desc2 = getStringValue(treeItem2.description);
        assert.ok(!desc1.includes('● active'), 'File1 should no longer be active');
        assert.ok(desc2.includes('● active'), 'File2 should now be active');
    });

    test('Should handle folder entries correctly', async () => {
        const folderUri = vscode.Uri.file('/test/folder');
        const entry = await manager.addEntry(folderUri, 'folder');
        
        // Simulate some file being active (folders should never be active)
        (treeProvider as any).activeFileUri = vscode.Uri.file('/test/some-file.ts');
        
        const treeItem = treeProvider.getTreeItem(entry);
        
        assert.strictEqual(treeItem.contextValue, 'folder', 'Should be folder type');
        
        const descriptionStr = getStringValue(treeItem.description);
        assert.ok(!descriptionStr.includes('● active'), 'Folder should not have active indicator');
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed, 'Folder should be collapsible');
    });

    test('Should refresh tree when active file changes', () => {
        let refreshCalled = false;
        
        // Override the refresh method to detect calls
        const originalRefresh = treeProvider.refresh;
        treeProvider.refresh = () => {
            refreshCalled = true;
            originalRefresh.call(treeProvider);
        };
        
        // Simulate active file change event
        const testUri = vscode.Uri.file('/test/refresh-test.ts');
        
        // Fire the active file change event (simulating what happens in real usage)
        (manager as any)._onDidChangeActiveFile.fire(testUri);
        
        assert.strictEqual(refreshCalled, true, 'Tree should refresh when active file changes');
        
        // Restore original method
        treeProvider.refresh = originalRefresh;
    });
});