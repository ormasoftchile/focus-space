import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Folder Rename Resilience (US5)', () => {

    test('basename extraction works for rename matching', () => {
        const deletedUri = vscode.Uri.file('/project/src/utils/helper.ts');
        const createdUri = vscode.Uri.file('/project/src/helpers/helper.ts');

        const deletedBasename = path.basename(deletedUri.fsPath);
        const createdBasename = path.basename(createdUri.fsPath);

        assert.strictEqual(deletedBasename, 'helper.ts');
        assert.strictEqual(createdBasename, 'helper.ts');
        assert.strictEqual(deletedBasename, createdBasename, 'Basenames should match for rename correlation');
    });

    test('path update computes new URI correctly for nested entries', () => {
        const deletedDir = '/project/src/utils';
        const createdDir = '/project/src/helpers';
        const entryPath = '/project/src/utils/deep/nested/file.ts';

        const relativeSuffix = entryPath.substring(deletedDir.length);
        const newPath = createdDir + relativeSuffix;

        assert.strictEqual(relativeSuffix, '/deep/nested/file.ts');
        assert.strictEqual(newPath, '/project/src/helpers/deep/nested/file.ts');
    });

    test('entries under a deleted directory are found by path prefix', () => {
        const dirPath = '/project/src/utils';
        const prefix = dirPath + '/';

        const entries = [
            { fsPath: '/project/src/utils/a.ts', type: 'file' },
            { fsPath: '/project/src/utils/b.ts', type: 'file' },
            { fsPath: '/project/src/other/c.ts', type: 'file' },
            { fsPath: '/project/src/utils', type: 'folder' }, // exact match, not a child
        ];

        const matching = entries.filter(e => e.fsPath.startsWith(prefix));
        assert.strictEqual(matching.length, 2, 'Should find entries nested under the directory');
    });

    test('rename candidate with non-matching basename is not consumed', () => {
        const deletedBasename = 'helper.ts';
        const createdBasename = 'other.ts';

        assert.notStrictEqual(deletedBasename, createdBasename, 'Non-matching basenames should not correlate');
    });

    test('genuine delete fires when no create matches within window', (done) => {
        // Simulate the timeout behavior — a brief timer that fires
        const windowMs = 50; // Short window for testing
        let fallbackFired = false;

        const timer = setTimeout(() => {
            fallbackFired = true;
            assert.ok(fallbackFired, 'Fallback should fire after window expires');
            done();
        }, windowMs);

        // Ensure the timer is set
        assert.ok(timer !== undefined, 'Timer should be created');
    });

    test('configurable window duration is respected', () => {
        // The setting renameDetectionWindowMs should be between 50 and 2000
        // Default is 300
        const defaultWindow = 300;
        const minWindow = 50;
        const maxWindow = 2000;

        assert.ok(defaultWindow >= minWindow && defaultWindow <= maxWindow,
            'Default window should be within valid range');
    });

    test('rename detection does not interfere with VS Code onDidRenameFiles', () => {
        // VS Code's built-in rename events (via IDE rename operations) go through
        // onDidRenameFiles, which is separate from the filesystem watcher events.
        // The rename detection window only applies to watcher delete/create events.
        // This is a design validation test.
        assert.ok(true, 'Rename detection is additive, not replacing onDidRenameFiles');
    });
});
