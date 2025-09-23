import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('focus-space.focus-space'));
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('focus-space.focus-space');
        if (extension) {
            await extension.activate();
            assert.strictEqual(extension.isActive, true);
        } else {
            assert.fail('Extension not found');
        }
    });

    test('Test command should exist', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('focusSpace.test'));
    });
});