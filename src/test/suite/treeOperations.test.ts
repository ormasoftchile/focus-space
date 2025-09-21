import * as assert from 'assert';
import * as vscode from 'vscode';
import { TreeOperations } from '../../utils/treeOperations';
import { FocusEntry } from '../../models/focusEntry';

suite('Tree Operations Tests', () => {
    
    function createTestEntries(): FocusEntry[] {
        // Create a test tree structure:
        // root1 (section)
        //   - child1 (file)
        //   - child2 (folder)
        //     - grandchild1 (file)
        // root2 (file)
        return [
            {
                id: 'root1',
                uri: vscode.Uri.file('/test/root1'),
                type: 'section',
                label: 'Root Section',
                children: [
                    {
                        id: 'child1',
                        uri: vscode.Uri.file('/test/child1.txt'),
                        type: 'file',
                        metadata: { dateAdded: Date.now() }
                    },
                    {
                        id: 'child2',
                        uri: vscode.Uri.file('/test/child2'),
                        type: 'folder',
                        children: [
                            {
                                id: 'grandchild1',
                                uri: vscode.Uri.file('/test/child2/grandchild1.txt'),
                                type: 'file',
                                metadata: { dateAdded: Date.now() }
                            }
                        ],
                        metadata: { dateAdded: Date.now() }
                    }
                ],
                metadata: { dateAdded: Date.now() }
            },
            {
                id: 'root2',
                uri: vscode.Uri.file('/test/root2.txt'),
                type: 'file',
                metadata: { dateAdded: Date.now() }
            }
        ];
    }

    test('Should find entry by ID', () => {
        const testEntries = createTestEntries();
        const found = TreeOperations.findById(testEntries, 'grandchild1');
        assert.strictEqual(found?.id, 'grandchild1');
        assert.strictEqual(found?.type, 'file');
    });

    test('Should find entry by URI', () => {
        const testEntries = createTestEntries();
        const uri = vscode.Uri.file('/test/child1.txt');
        const found = TreeOperations.findByUri(testEntries, uri);
        assert.strictEqual(found?.id, 'child1');
    });

    test('Should find parent of child entry', () => {
        const testEntries = createTestEntries();
        const parent = TreeOperations.findParent(testEntries, 'child1');
        assert.strictEqual(parent?.id, 'root1');
        
        const grandParent = TreeOperations.findParent(testEntries, 'grandchild1');
        assert.strictEqual(grandParent?.id, 'child2');
    });

    test('Should return undefined for top-level entry parent', () => {
        const testEntries = createTestEntries();
        const parent = TreeOperations.findParent(testEntries, 'root1');
        assert.strictEqual(parent, undefined);
    });

    test('Should remove entry by ID', () => {
        const testEntries = createTestEntries();
        const removed = TreeOperations.removeById(testEntries, 'child1');
        assert.strictEqual(removed, true);
        
        const found = TreeOperations.findById(testEntries, 'child1');
        assert.strictEqual(found, undefined);
    });

    test('Should get top-level entries', () => {
        const testEntries = createTestEntries();
        const topLevel = TreeOperations.getTopLevelEntries(testEntries);
        assert.strictEqual(topLevel.length, 2);
        assert.strictEqual(topLevel[0].id, 'root1');
        assert.strictEqual(topLevel[1].id, 'root2');
    });

    test('Should flatten tree structure', () => {
        const testEntries = createTestEntries();
        const flattened = TreeOperations.flatten(testEntries);
        assert.strictEqual(flattened.length, 5); // root1, child1, child2, grandchild1, root2
        
        const ids = flattened.map(entry => entry.id);
        assert.ok(ids.includes('root1'));
        assert.ok(ids.includes('child1'));
        assert.ok(ids.includes('child2'));
        assert.ok(ids.includes('grandchild1'));
        assert.ok(ids.includes('root2'));
    });

    test('Should get entries by type', () => {
        const testEntries = createTestEntries();
        const files = TreeOperations.getEntriesByType(testEntries, 'file');
        assert.strictEqual(files.length, 3); // child1, grandchild1, root2
        
        const sections = TreeOperations.getEntriesByType(testEntries, 'section');
        assert.strictEqual(sections.length, 1); // root1
    });

    test('Should get correct depth', () => {
        const testEntries = createTestEntries();
        assert.strictEqual(TreeOperations.getDepth(testEntries, 'root1'), 0);
        assert.strictEqual(TreeOperations.getDepth(testEntries, 'child1'), 1);
        assert.strictEqual(TreeOperations.getDepth(testEntries, 'grandchild1'), 2);
    });

    test('Should get path to entry', () => {
        const testEntries = createTestEntries();
        const path = TreeOperations.getPath(testEntries, 'grandchild1');
        assert.strictEqual(path.length, 3);
        assert.strictEqual(path[0].id, 'root1');
        assert.strictEqual(path[1].id, 'child2');
        assert.strictEqual(path[2].id, 'grandchild1');
    });

    test('Should convert to and from serializable format', () => {
        const testEntries = createTestEntries();
        const serializable = TreeOperations.toSerializable(testEntries);
        const restored = TreeOperations.fromSerializable(serializable);
        
        // Check structure is preserved
        assert.strictEqual(restored.length, 2);
        assert.strictEqual(restored[0].id, 'root1');
        assert.strictEqual(restored[0].children?.length, 2);
        assert.strictEqual(restored[0].children?.[1].children?.length, 1);
    });

    test('Should count total entries', () => {
        const testEntries = createTestEntries();
        const count = TreeOperations.count(testEntries);
        assert.strictEqual(count, 5);
    });

    test('Should check if entry exists', () => {
        const testEntries = createTestEntries();
        assert.strictEqual(TreeOperations.exists(testEntries, 'grandchild1'), true);
        assert.strictEqual(TreeOperations.exists(testEntries, 'nonexistent'), false);
    });
});