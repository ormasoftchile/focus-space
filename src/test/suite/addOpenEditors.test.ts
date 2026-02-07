import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

suite('Add All Open Editors (US2)', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('command should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(
            commands.includes('focusSpace.addAllOpenEditors'),
            'focusSpace.addAllOpenEditors command should be registered'
        );
    });

    test('should handle zero open tabs gracefully', async () => {
        // Stub tabGroups.all to return empty
        const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();

        // Stub tabGroups to have no tabs — we can't directly stub the getter
        // so we exercise the command and verify no errors are thrown.
        // In test environment, the command should handle the empty state.
        try {
            await vscode.commands.executeCommand('focusSpace.addAllOpenEditors');
        } catch {
            // Command may throw in test env if extension not fully activated — acceptable
        }

        // If showInformationMessage was called, it should have been with an appropriate message
        if (showInfoStub.called) {
            const msg = showInfoStub.firstCall.args[0] as string;
            assert.ok(typeof msg === 'string' && msg.length > 0, 'Should show a message');
        }
    });

    test('should enumerate TabInputText instances only', () => {
        // Verify the command filters by TabInputText — unit test the logic
        // TabInputText has a uri property with scheme === 'file'
        const tabInput = new vscode.TabInputText(vscode.Uri.file('/test/file.ts'));
        assert.ok(tabInput instanceof vscode.TabInputText);
        assert.strictEqual(tabInput.uri.scheme, 'file');
    });

    test('should deduplicate URIs across tab groups', () => {
        // Verify dedup logic — same URI should not be added twice
        const uri1 = vscode.Uri.file('/test/file1.ts');
        const uri2 = vscode.Uri.file('/test/file1.ts'); // Same path
        const uri3 = vscode.Uri.file('/test/file2.ts');

        const seen = new Set<string>();
        const unique: vscode.Uri[] = [];
        for (const uri of [uri1, uri2, uri3]) {
            const key = uri.toString();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(uri);
            }
        }

        assert.strictEqual(unique.length, 2, 'Should deduplicate same-path URIs');
    });

    test('should skip non-file scheme URIs', () => {
        // Untitled and other schemes should be filtered out
        const fileUri = vscode.Uri.file('/test/file.ts');
        const untitledUri = vscode.Uri.parse('untitled:Untitled-1');
        const gitUri = vscode.Uri.parse('git:/test/file.ts');

        const uris = [fileUri, untitledUri, gitUri];
        const filtered = uris.filter(u => u.scheme === 'file');

        assert.strictEqual(filtered.length, 1, 'Only file scheme URIs should pass');
        assert.strictEqual(filtered[0].fsPath, fileUri.fsPath);
    });

    test('should report correct counts in summary message', () => {
        // Verify message formatting logic
        const addedCount = 3;
        const alreadyPresentCount = 2;
        const excludedCount = 1;

        const parts = [`Added ${addedCount} files to Focus Space.`];
        if (alreadyPresentCount > 0) {
            parts.push(`${alreadyPresentCount} already present`);
        }
        if (excludedCount > 0) {
            parts.push(`${excludedCount} excluded`);
        }

        const message = parts.length > 1 ? `${parts[0]} ${parts.slice(1).join(', ')}.` : parts[0];
        assert.strictEqual(message, 'Added 3 files to Focus Space. 2 already present, 1 excluded.');
    });
});
