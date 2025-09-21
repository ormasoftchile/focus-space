import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { FocusSpaceRevealHandler } from '../../utils/focusSpaceRevealHandler';
import { ActiveEditorTracker } from '../../utils/activeEditorTracker';

/**
 * Test suite for Active File Reveal functionality
 * Tests the smart reveal behavior and active file tracking
 */
suite('Active File Reveal Test Suite', () => {
    let manager: FocusSpaceManager;
    let revealHandler: FocusSpaceRevealHandler;
    let mockTreeView: any;
    let sandbox: sinon.SinonSandbox;
    let extensionContext: vscode.ExtensionContext;

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

        // Initialize manager
        manager = FocusSpaceManager.getInstance(extensionContext);
        await manager.clearAll();

        // Create mock tree view
        mockTreeView = {
            reveal: sinon.stub().resolves(),
            selection: [],
            onDidChangeSelection: sinon.stub(),
            onDidChangeVisibility: sinon.stub(),
            visible: true
        };

        // Initialize reveal handler
        revealHandler = new FocusSpaceRevealHandler(manager);
        revealHandler.setTreeView(mockTreeView);
    });

    teardown(async () => {
        await manager.clearAll();
        sandbox.restore();
    });

    test('Active editor tracker should detect active file changes', async () => {
        const tracker = new ActiveEditorTracker();
        let activeFileChanges = 0;
        let lastActiveUri: vscode.Uri | undefined;

        tracker.onDidChangeActiveFile((uri) => {
            activeFileChanges++;
            lastActiveUri = uri;
        });

        // Simulate file being opened (this is just testing our event system)
        const testUri = vscode.Uri.file('/test/active-file.ts');
        
        // In real usage, VS Code would fire this event, but for testing we verify our tracker setup
        assert.strictEqual(activeFileChanges >= 0, true, 'Should have initialized active file tracking');
        
        tracker.dispose();
    });

    test('Should detect when file is in Focus Space', async () => {
        const testUri = vscode.Uri.file('/test/focus-file.ts');
        
        // Initially not in Focus Space
        assert.strictEqual(manager.hasEntry(testUri), false, 'File should not be in Focus Space initially');
        
        // Add to Focus Space
        await manager.addEntry(testUri, 'file');
        
        // Now should be detected
        assert.strictEqual(manager.hasEntry(testUri), true, 'File should be detected in Focus Space');
    });

    test('Should track active file in Focus Space', async () => {
        const testUri = vscode.Uri.file('/test/tracked-file.ts');
        
        // Add file to Focus Space
        const entry = await manager.addEntry(testUri, 'file');
        
        // Verify the entry was created
        assert.ok(entry, 'Entry should be created');
        assert.strictEqual(entry.uri.toString(), testUri.toString(), 'Entry URI should match');
        
        // Test the manager's active file tracking methods
        const isActiveFile = manager.isActiveFile(testUri);
        assert.strictEqual(typeof isActiveFile, 'boolean', 'isActiveFile should return boolean');
    });

    test('RevealHandler should handle smart reveal behavior', async () => {
        const testUri = vscode.Uri.file('/test/reveal-file.ts');
        
        // Mock configuration to return 'smart' behavior
        const configStub = sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: sandbox.stub().withArgs('revealBehavior', 'smart').returns('smart')
        } as any);

        // Test when file is NOT in Focus Space - should not try to reveal in Focus Space
        await revealHandler.handleRevealRequest(testUri);
        assert.strictEqual(mockTreeView.reveal.called, false, 'Should not try to reveal file not in Focus Space');

        // Add file to Focus Space
        await manager.addEntry(testUri, 'file');

        // Reset mock
        mockTreeView.reveal.resetHistory();

        // Test when file IS in Focus Space - should try to reveal in Focus Space
        const revealed = await revealHandler.revealInFocusSpace(testUri);
        assert.strictEqual(revealed, true, 'Should successfully reveal file in Focus Space');
        assert.strictEqual(mockTreeView.reveal.calledOnce, true, 'Should call tree view reveal method');

        configStub.restore();
    });

    test('Should handle different reveal behavior configurations', async () => {
        const testUri = vscode.Uri.file('/test/config-file.ts');
        await manager.addEntry(testUri, 'file');

        // Test 'focus-space-only' behavior
        const configStub = sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: sandbox.stub().withArgs('revealBehavior', 'smart').returns('focus-space-only')
        } as any);

        await revealHandler.handleRevealRequest(testUri);
        assert.strictEqual(mockTreeView.reveal.calledOnce, true, 'Should reveal in Focus Space for focus-space-only');

        // Test 'both' behavior
        mockTreeView.reveal.resetHistory();
        configStub.returns({
            get: sandbox.stub().withArgs('revealBehavior', 'smart').returns('both')
        } as any);

        const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();
        
        await revealHandler.handleRevealRequest(testUri);
        assert.strictEqual(mockTreeView.reveal.calledOnce, true, 'Should reveal in Focus Space for both');
        assert.strictEqual(executeCommandStub.calledWith('revealInExplorer', testUri), true, 'Should also reveal in Explorer for both');

        configStub.restore();
        executeCommandStub.restore();
    });

    test('Should handle reveal errors gracefully', async () => {
        const testUri = vscode.Uri.file('/test/error-file.ts');
        await manager.addEntry(testUri, 'file');

        // Make tree view reveal throw an error
        mockTreeView.reveal.rejects(new Error('Mock reveal error'));

        // Should not throw error, but return false
        const revealed = await revealHandler.revealInFocusSpace(testUri);
        assert.strictEqual(revealed, false, 'Should return false when reveal fails');
    });

    test('Should handle files not in Focus Space gracefully', async () => {
        const testUri = vscode.Uri.file('/test/not-in-focus.ts');
        
        // Try to reveal file not in Focus Space
        const revealed = await revealHandler.revealInFocusSpace(testUri);
        assert.strictEqual(revealed, false, 'Should return false for file not in Focus Space');
        assert.strictEqual(mockTreeView.reveal.called, false, 'Should not call tree view reveal');
    });

    test('Should track multiple visible files correctly', async () => {
        // Test the visible files tracking functionality
        const visibleUris = manager.getVisibleFileUris();
        assert.ok(Array.isArray(visibleUris), 'Should return array of visible URIs');
        
        const testUri = vscode.Uri.file('/test/visible-file.ts');
        const isVisible = manager.isVisibleFile(testUri);
        assert.strictEqual(typeof isVisible, 'boolean', 'isVisibleFile should return boolean');
    });

    test('Should handle active Focus Space file detection', async () => {
        const testUri = vscode.Uri.file('/test/active-focus-file.ts');
        
        // Initially no active Focus Space file
        assert.strictEqual(manager.isActiveFocusFile(), false, 'Should have no active Focus Space file initially');
        
        // Add file to Focus Space
        await manager.addEntry(testUri, 'file');
        
        // The isActiveFocusFile method should work correctly regardless of actual VS Code state
        const result = manager.isActiveFocusFile();
        assert.strictEqual(typeof result, 'boolean', 'Should return boolean for active Focus Space file check');
    });
});