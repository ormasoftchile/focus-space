import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusEntry, SerializableFocusEntry, FocusSpaceConfig } from '../../models/focusEntry';

suite('FocusEntry Data Model Tests', () => {

    test('FocusEntry interface should have required properties', () => {
        const testUri = vscode.Uri.file('/test/file.ts');
        const entry: FocusEntry = {
            id: 'test-id',
            uri: testUri,
            type: 'file'
        };

        assert.strictEqual(entry.id, 'test-id');
        assert.strictEqual(entry.uri.toString(), testUri.toString());
        assert.strictEqual(entry.type, 'file');
    });

    test('FocusEntry should support optional properties', () => {
        const testUri = vscode.Uri.file('/test/folder');
        const entry: FocusEntry = {
            id: 'test-folder',
            uri: testUri,
            type: 'folder',
            label: 'Custom Label',
            children: [],
            metadata: {
                dateAdded: Date.now(),
                relativePath: 'test/folder',
                order: 1
            }
        };

        assert.strictEqual(entry.label, 'Custom Label');
        assert.ok(Array.isArray(entry.children));
        assert.ok(entry.metadata);
        assert.ok(typeof entry.metadata.dateAdded === 'number');
    });

    test('Section type should support children', () => {
        const childEntry: FocusEntry = {
            id: 'child-1',
            uri: vscode.Uri.file('/test/child.ts'),
            type: 'file'
        };

        const sectionEntry: FocusEntry = {
            id: 'section-1',
            uri: vscode.Uri.parse('focus-section://section-1'),
            type: 'section',
            label: 'Test Section',
            children: [childEntry]
        };

        assert.strictEqual(sectionEntry.type, 'section');
        assert.ok(sectionEntry.children);
        assert.strictEqual(sectionEntry.children.length, 1);
        assert.strictEqual(sectionEntry.children[0].id, 'child-1');
    });

    test('SerializableFocusEntry should convert URI to string', () => {
        const testUri = vscode.Uri.file('/test/file.ts');
        const serializable: SerializableFocusEntry = {
            id: 'test-id',
            uriString: testUri.toString(),
            type: 'file'
        };

        assert.strictEqual(serializable.uriString, testUri.toString());
        assert.strictEqual(typeof serializable.uriString, 'string');
    });

    test('FocusSpaceConfig should have version and entries', () => {
        const config: FocusSpaceConfig = {
            version: '1.0.0',
            entries: [],
            lastModified: Date.now()
        };

        assert.strictEqual(config.version, '1.0.0');
        assert.ok(Array.isArray(config.entries));
        assert.ok(typeof config.lastModified === 'number');
    });

    test('Metadata should support all optional fields', () => {
        const metadata = {
            dateAdded: Date.now(),
            relativePath: 'src/test.ts',
            gitStatus: 'M',
            order: 5
        };

        assert.ok(typeof metadata.dateAdded === 'number');
        assert.strictEqual(metadata.relativePath, 'src/test.ts');
        assert.strictEqual(metadata.gitStatus, 'M');
        assert.strictEqual(metadata.order, 5);
    });
});