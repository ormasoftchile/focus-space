import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { FileSystemWatcher } from '../../utils/fileSystemWatcher';

suite('FileSystemWatcher Tests', () => {
    let manager: FocusSpaceManager;
    let fileWatcher: FileSystemWatcher;
    let mockContext: vscode.ExtensionContext;
    let sandbox: sinon.SinonSandbox;

    setup(async () => {
        sandbox = sinon.createSandbox();
        
        // Create mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: sandbox.stub().returns(undefined),
                update: sandbox.stub().resolves(),
                keys: sandbox.stub().returns([])
            },
            globalState: {
                get: sandbox.stub().returns(undefined),
                update: sandbox.stub().resolves(),
                keys: sandbox.stub().returns([])
            },
            extensionUri: vscode.Uri.file('/test'),
            extensionPath: '/test',
            storagePath: '/test/storage',
            globalStoragePath: '/test/global',
            logPath: '/test/log',
            asAbsolutePath: sandbox.stub().returns('/test'),
            storageUri: vscode.Uri.file('/test/storage'),
            globalStorageUri: vscode.Uri.file('/test/global'),
            logUri: vscode.Uri.file('/test/log'),
            extensionMode: vscode.ExtensionMode.Test,
            extension: {} as vscode.Extension<any>,
            secrets: {} as vscode.SecretStorage,
            environmentVariableCollection: {} as vscode.EnvironmentVariableCollection
        } as any;

        // Initialize manager and file watcher
        manager = FocusSpaceManager.getInstance(mockContext);
        await manager.clearAll(); // Start with clean state
        
        fileWatcher = FileSystemWatcher.getInstance(manager);
    });

    teardown(async () => {
        // Clean up
        if (fileWatcher) {
            fileWatcher.dispose();
        }
        await manager.clearAll();
        sandbox.restore();
    });

    suite('File System Watcher Initialization', () => {
        test('should create singleton instance', () => {
            const instance1 = FileSystemWatcher.getInstance(manager);
            const instance2 = FileSystemWatcher.getInstance();
            
            assert.strictEqual(instance1, instance2, 'Should return same singleton instance');
        });

        test('should require manager for first initialization', () => {
            // Dispose current instance to test fresh initialization
            fileWatcher.dispose();
            
            assert.throws(() => {
                FileSystemWatcher.getInstance();
            }, /Manager required for first initialization/);
        });

        test('should setup watchers on initialization', () => {
            // File watcher should be initialized without errors
            assert.ok(fileWatcher, 'File watcher should be created');
        });
    });

    suite('File Watching Operations', () => {
        test('should handle file rename events', async () => {
            // Add a test entry
            const testUri = vscode.Uri.file('/test/file.ts');
            const newUri = vscode.Uri.file('/test/renamed.ts');
            const entry = await manager.addEntry(testUri, 'file');

            // Simulate rename event
            const renameEvent: vscode.FileRenameEvent = {
                files: [{ oldUri: testUri, newUri: newUri }]
            };

            // Spy on manager methods
            const refreshSpy = sandbox.spy(manager, 'refresh');
            const saveNowSpy = sandbox.spy(manager, 'saveNow');

            // Trigger rename handling
            await (fileWatcher as any).handleRenameFiles(renameEvent);

            // Verify entry was updated
            const updatedEntry = manager.getEntry(entry.id);
            assert.ok(updatedEntry, 'Entry should still exist');
            assert.strictEqual(updatedEntry.uri.fsPath, newUri.fsPath, 'Entry URI should be updated');

            // Verify manager was notified
            assert.ok(saveNowSpy.calledOnce, 'Manager should save changes');
            assert.ok(refreshSpy.calledOnce, 'Manager should refresh view');
        });

        test('should handle file deletion events', async () => {
            // Add a test entry
            const testUri = vscode.Uri.file('/test/file.ts');
            const entry = await manager.addEntry(testUri, 'file');

            // Mock user response to deletion
            const showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage') as sinon.SinonStub;
            showWarningMessageStub.resolves('Remove');

            // Simulate delete event
            const deleteEvent: vscode.FileDeleteEvent = {
                files: [testUri]
            };

            // Trigger delete handling
            await (fileWatcher as any).handleDeleteFiles(deleteEvent);

            // Verify entry was removed
            const removedEntry = manager.getEntry(entry.id);
            assert.strictEqual(removedEntry, undefined, 'Entry should be removed');

            // Verify user was notified
            assert.ok(showWarningMessageStub.calledOnce, 'User should be prompted about deletion');
        });

        test('should handle keeping deleted files', async () => {
            // Add a test entry
            const testUri = vscode.Uri.file('/test/file.ts');
            const entry = await manager.addEntry(testUri, 'file');

            // Mock user response to keep file
            const showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage') as sinon.SinonStub;
            showWarningMessageStub.resolves('Keep');

            // Simulate delete event
            const deleteEvent: vscode.FileDeleteEvent = {
                files: [testUri]
            };

            // Trigger delete handling
            await (fileWatcher as any).handleDeleteFiles(deleteEvent);

            // Verify entry was kept
            const keptEntry = manager.getEntry(entry.id);
            assert.ok(keptEntry, 'Entry should be kept');
            assert.strictEqual(keptEntry.uri.fsPath, testUri.fsPath, 'Entry URI should be unchanged');
        });
    });

    suite('Workspace Changes', () => {
        test('should handle workspace folder removal', async () => {
            // Add entries in different workspace folders
            const folderUri = vscode.Uri.file('/workspace1');
            const fileInFolder = vscode.Uri.file('/workspace1/file.ts');
            const fileOutsideFolder = vscode.Uri.file('/workspace2/file.ts');

            const entry1 = await manager.addEntry(fileInFolder, 'file');
            const entry2 = await manager.addEntry(fileOutsideFolder, 'file');

            // Mock workspace folder removal
            const removedFolder: vscode.WorkspaceFolder = {
                uri: folderUri,
                name: 'workspace1',
                index: 0
            };

            const changeEvent: vscode.WorkspaceFoldersChangeEvent = {
                added: [],
                removed: [removedFolder]
            };

            // Mock user response to remove affected entries
            const showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage') as sinon.SinonStub;
            showWarningMessageStub.resolves('Remove All');

            // Trigger workspace change handling
            await (fileWatcher as any).handleWorkspaceFoldersChange(changeEvent);

            // Verify affected entry was removed, unaffected entry kept
            const removedEntry = manager.getEntry(entry1.id);
            const keptEntry = manager.getEntry(entry2.id);

            assert.strictEqual(removedEntry, undefined, 'Entry in removed folder should be removed');
            assert.ok(keptEntry, 'Entry outside removed folder should be kept');
        });

        test('should handle workspace folder addition', async () => {
            // Mock workspace folder addition
            const addedFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/new-workspace'),
                name: 'new-workspace',
                index: 1
            };

            const changeEvent: vscode.WorkspaceFoldersChangeEvent = {
                added: [addedFolder],
                removed: []
            };

            // Spy on updateWatchers to verify it's called
            const updateWatchersSpy = sandbox.spy(fileWatcher as any, 'updateWatchers');

            // Trigger workspace change handling
            await (fileWatcher as any).handleWorkspaceFoldersChange(changeEvent);

            // Verify watchers were updated for new folder
            assert.ok(updateWatchersSpy.calledOnce, 'Watchers should be updated when folders are added');
        });
    });

    suite('Path Resolution and Updates', () => {
        test('should update entry URI correctly', async () => {
            // Add a test entry
            const oldUri = vscode.Uri.file('/test/old.ts');
            const newUri = vscode.Uri.file('/test/new.ts');
            const entry = await manager.addEntry(oldUri, 'file', undefined, 'Test File');

            // Update the entry URI
            await (fileWatcher as any).updateEntryUri(entry, newUri);

            // Verify URI was updated
            assert.strictEqual(entry.uri.fsPath, newUri.fsPath, 'Entry URI should be updated');

            // Verify metadata was updated if present
            if (entry.metadata) {
                const expectedRelativePath = vscode.workspace.asRelativePath(newUri);
                assert.strictEqual(entry.metadata.relativePath, expectedRelativePath, 'Metadata relative path should be updated');
            }
        });

        test('should find entries by URI correctly', async () => {
            // Add test entries
            const uri1 = vscode.Uri.file('/test/file1.ts');
            const uri2 = vscode.Uri.file('/test/file2.ts');
            const entry1 = await manager.addEntry(uri1, 'file');
            const entry2 = await manager.addEntry(uri2, 'file');

            // Find entries by URI
            const foundEntry1 = (fileWatcher as any).findEntryByUri(uri1);
            const foundEntry2 = (fileWatcher as any).findEntryByUri(uri2);
            const notFound = (fileWatcher as any).findEntryByUri(vscode.Uri.file('/test/nonexistent.ts'));

            assert.strictEqual(foundEntry1?.id, entry1.id, 'Should find first entry by URI');
            assert.strictEqual(foundEntry2?.id, entry2.id, 'Should find second entry by URI');
            assert.strictEqual(notFound, undefined, 'Should not find non-existent entry');
        });

        test('should handle sections correctly in path operations', async () => {
            // Create a section with files
            const section = await manager.createSection('Test Section');
            const fileUri = vscode.Uri.file('/test/file.ts');
            const fileEntry = await manager.addEntry(fileUri, 'file');
            await manager.moveToSection(fileEntry.id, section.id);

            // Get all entries (should include section and file)
            const allEntries = (fileWatcher as any).getAllEntries();
            
            // Verify section is included but files in sections are also included
            const hasSection = allEntries.some((e: any) => e.type === 'section');
            const hasFile = allEntries.some((e: any) => e.type === 'file' && e.uri.fsPath === fileUri.fsPath);

            assert.ok(hasSection, 'Should include sections in all entries');
            assert.ok(hasFile, 'Should include files from sections');
        });
    });

    suite('Error Handling', () => {
        test('should handle file system errors gracefully', async () => {
            // Mock file existence check to throw error
            const fileExistsStub = sandbox.stub(fileWatcher as any, 'fileExists');
            fileExistsStub.rejects(new Error('File system error'));

            const testUri = vscode.Uri.file('/test/file.ts');
            const entry = await manager.addEntry(testUri, 'file');

            // Should not throw when handling possible file move with errors
            await assert.doesNotReject(async () => {
                await (fileWatcher as any).handlePossibleFileMove(entry, vscode.Uri.file('/test/moved.ts'));
            });
        });

        test('should handle watcher creation errors', async () => {
            // Mock createFileSystemWatcher to throw error
            const createWatcherStub = sandbox.stub(vscode.workspace, 'createFileSystemWatcher');
            createWatcherStub.throws(new Error('Watcher creation failed'));

            // Should not throw when trying to create watchers
            assert.doesNotThrow(() => {
                (fileWatcher as any).createWatcherForPath('/invalid/path');
            });
        });
    });
});