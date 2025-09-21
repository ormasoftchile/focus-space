import * as assert from 'assert';
import * as vscode from 'vscode';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';

suite('Section Creation Refresh Bug Fix Test', () => {
    let manager: FocusSpaceManager;

    suiteSetup(async () => {
        manager = FocusSpaceManager.getInstance(
            {
                globalState: {
                    get: () => undefined,
                    update: () => Promise.resolve()
                } as any,
                workspaceState: {
                    get: () => undefined,
                    update: () => Promise.resolve()
                } as any
            } as any
        );
    });

    test('Creating section should fire tree data change event', async () => {
        let eventFired = false;
        
        // Listen for the tree data change event
        const disposable = manager.onDidChange(() => {
            eventFired = true;
        });

        try {
            // Create a section
            const section = await manager.createSection('Test Section for Refresh');
            
            // Verify the event was fired
            assert.strictEqual(eventFired, true, 'Tree data change event should be fired when creating a section');
            
            // Verify the section was actually created
            assert.ok(section, 'Section should be created');
            assert.strictEqual(section.label, 'Test Section for Refresh', 'Section should have correct label');
            assert.strictEqual(section.type, 'section', 'Entry should be a section');
            
            // Clean up
            manager.removeEntry(section.id);
            
        } finally {
            disposable.dispose();
        }
    });
});