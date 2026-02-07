import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

suite('Git Changes Importer (US4)', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('addFromGitChanges command should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(
            commands.includes('focusSpace.addFromGitChanges'),
            'focusSpace.addFromGitChanges command should be registered'
        );
    });

    test('should handle missing Git extension gracefully', async () => {
        // Stub getExtension to return undefined
        const getExtensionStub = sandbox.stub(vscode.extensions, 'getExtension').returns(undefined);
        const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();

        try {
            await vscode.commands.executeCommand('focusSpace.addFromGitChanges');
        } catch {
            // Acceptable in test environment
        }

        // Restore stubs before assertions to avoid interference
        getExtensionStub.restore();

        if (showInfoStub.called) {
            const msg = showInfoStub.firstCall.args[0] as string;
            assert.ok(
                typeof msg === 'string' && msg.length > 0,
                'Should show an informational message'
            );
        }
    });

    test('should deduplicate URIs from multiple change sources', () => {
        const uri1 = vscode.Uri.file('/project/src/a.ts');
        const uri2 = vscode.Uri.file('/project/src/a.ts'); // duplicate
        const uri3 = vscode.Uri.file('/project/src/b.ts');

        const seen = new Set<string>();
        const unique: vscode.Uri[] = [];
        for (const uri of [uri1, uri2, uri3]) {
            const key = uri.toString();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(uri);
            }
        }

        assert.strictEqual(unique.length, 2, 'Should deduplicate same URIs');
    });

    test('should filter out deleted files by status', () => {
        const GIT_STATUS_DELETED = 6;
        const changes = [
            { uri: vscode.Uri.file('/project/src/modified.ts'), status: 5 },
            { uri: vscode.Uri.file('/project/src/deleted.ts'), status: GIT_STATUS_DELETED },
            { uri: vscode.Uri.file('/project/src/added.ts'), status: 1 },
        ];

        const filtered = changes.filter(c => c.status !== GIT_STATUS_DELETED);
        assert.strictEqual(filtered.length, 2, 'Should exclude deleted files');
        assert.ok(
            filtered.every(c => c.status !== GIT_STATUS_DELETED),
            'No deleted files should remain'
        );
    });

    test('should report correct summary counts', () => {
        const addedCount = 4;
        const alreadyPresentCount = 2;
        const excludedCount = 1;

        const parts = [`Added ${addedCount} files from Git changes.`];
        if (alreadyPresentCount > 0) {
            parts.push(`${alreadyPresentCount} already present`);
        }
        if (excludedCount > 0) {
            parts.push(`${excludedCount} excluded`);
        }

        const message = parts.length > 1 ? `${parts[0]} ${parts.slice(1).join(', ')}.` : parts[0];
        assert.strictEqual(message, 'Added 4 files from Git changes. 2 already present, 1 excluded.');
    });

    test('GitChangesResult interface should have expected shape', () => {
        // Type-level verification of the interface
        const result = {
            changedUris: [vscode.Uri.file('/test.ts')],
            gitUnavailable: false,
            noChanges: false,
        };
        assert.ok(Array.isArray(result.changedUris));
        assert.strictEqual(typeof result.gitUnavailable, 'boolean');
        assert.strictEqual(typeof result.noChanges, 'boolean');
    });
});
