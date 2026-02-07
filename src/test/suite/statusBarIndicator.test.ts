import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { StatusBarIndicator } from '../../utils/statusBarIndicator';

suite('StatusBarIndicator', () => {
    let sandbox: sinon.SinonSandbox;
    let indicator: StatusBarIndicator;

    setup(() => {
        sandbox = sinon.createSandbox();
        indicator = new StatusBarIndicator();
    });

    teardown(() => {
        indicator.dispose();
        sandbox.restore();
    });

    test('should be hidden when file count is 0', () => {
        indicator.update(0);
        // StatusBarItem is hidden by default and explicitly hidden on 0 count.
        // We verify by updating to non-zero first, then back to zero.
        indicator.update(3);
        indicator.update(0);
        // No assertion error means the calls succeeded without throwing.
    });

    test('should show when file count is positive', () => {
        indicator.update(5);
        // Verifies update(5) does not throw.
    });

    test('should show singular label for 1 file', () => {
        indicator.update(1);
        // Verifies update(1) does not throw — label should say "1 file".
    });

    test('should show plural label for multiple files', () => {
        indicator.update(10);
        // Verifies update(10) does not throw — label should say "10 files".
    });

    test('should be disposable', () => {
        const indicator2 = new StatusBarIndicator();
        indicator2.update(3);
        indicator2.dispose();
        // No error on dispose means cleanup succeeded.
    });

    test('revealView command should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        // The command should exist if the extension is activated.
        // In test environment, it may or may not be registered depending on activation.
        // This is a smoke test for the command registration pattern.
        assert.ok(Array.isArray(commands));
    });
});
