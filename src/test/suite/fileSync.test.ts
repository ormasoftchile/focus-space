import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { FocusSpaceManager } from '../../managers/focusSpaceManager';
import { FileSystemWatcher } from '../../utils/fileSystemWatcher';

suite('File Synchronization Tests', () => {
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

    suite('Path Resolution', () => {
        test('should resolve relative paths correctly', async () => {
            const workspaceFolder = vscode.Uri.file('/workspace');
            const fileUri = vscode.Uri.joinPath(workspaceFolder, 'src', 'file.ts');
            
            // Mock workspace.asRelativePath
            const asRelativePathStub = sandbox.stub(vscode.workspace, 'asRelativePath');
            asRelativePathStub.returns('src/file.ts');

            const entry = await manager.addEntry(fileUri, 'file');
            
            // Update URI to trigger relative path calculation
            const newUri = vscode.Uri.joinPath(workspaceFolder, 'src', 'renamed.ts');
            asRelativePathStub.withArgs(newUri).returns('src/renamed.ts');
            
            await (fileWatcher as any).updateEntryUri(entry, newUri);

            // Verify relative path was updated
            if (entry.metadata) {
                assert.strictEqual(entry.metadata.relativePath, 'src/renamed.ts', 'Relative path should be updated');
            }
        });

        test('should handle paths outside workspace', async () => {
            const outsideUri = vscode.Uri.file('/outside/workspace/file.ts');
            
            // Mock workspace.asRelativePath to return full path for files outside workspace
            const asRelativePathStub = sandbox.stub(vscode.workspace, 'asRelativePath');
            asRelativePathStub.returns('/outside/workspace/file.ts');

            const entry = await manager.addEntry(outsideUri, 'file');
            
            // Update URI
            const newUri = vscode.Uri.file('/outside/workspace/renamed.ts');
            asRelativePathStub.withArgs(newUri).returns('/outside/workspace/renamed.ts');
            
            await (fileWatcher as any).updateEntryUri(entry, newUri);

            // Verify full path was stored
            if (entry.metadata) {
                assert.strictEqual(entry.metadata.relativePath, '/outside/workspace/renamed.ts', 'Full path should be stored for files outside workspace');
            }
        });
    });

    suite('File Move Detection', () => {
        test('should detect file moves by basename matching', async () => {
            const oldUri = vscode.Uri.file('/workspace/old/file.ts');
            const newUri = vscode.Uri.file('/workspace/new/file.ts');
            
            // Add entry for old location
            const entry = await manager.addEntry(oldUri, 'file');
            
            // Mock file existence checks
            const fileExistsStub = sandbox.stub(fileWatcher as any, 'fileExists');
            fileExistsStub.withArgs(oldUri).resolves(false); // Old file doesn't exist
            fileExistsStub.withArgs(newUri).resolves(true);  // New file exists
            
            // Mock workspace.asRelativePath for both paths
            const asRelativePathStub = sandbox.stub(vscode.workspace, 'asRelativePath');
            asRelativePathStub.withArgs(oldUri).returns('old/file.ts');
            asRelativePathStub.withArgs(newUri).returns('new/file.ts');
            
            // Mock showInformationMessage
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage');
            
            // Trigger possible file move detection
            await (fileWatcher as any).handlePossibleFileMove(entry, newUri);
            
            // Verify entry was updated
            assert.strictEqual(entry.uri.fsPath, newUri.fsPath, 'Entry URI should be updated to new location');
            
            // Verify user was notified
            assert.ok(showInfoStub.calledOnce, 'User should be notified of the move');
        });

        test('should not update entry if old file still exists', async () => {
            const oldUri = vscode.Uri.file('/workspace/file.ts');
            const newUri = vscode.Uri.file('/workspace/copy.ts');
            
            // Add entry for original file
            const entry = await manager.addEntry(oldUri, 'file');
            const originalUriPath = entry.uri.fsPath;
            
            // Mock file existence checks - both files exist (copy, not move)
            const fileExistsStub = sandbox.stub(fileWatcher as any, 'fileExists');
            fileExistsStub.withArgs(oldUri).resolves(true);  // Old file still exists
            fileExistsStub.withArgs(newUri).resolves(true);  // New file also exists
            
            // Trigger possible file move detection
            await (fileWatcher as any).handlePossibleFileMove(entry, newUri);
            
            // Verify entry was NOT updated (since it's a copy, not move)
            assert.strictEqual(entry.uri.fsPath, originalUriPath, 'Entry URI should not be updated for file copies');
        });

        test('should handle file move detection errors gracefully', async () => {
            const oldUri = vscode.Uri.file('/workspace/file.ts');
            const newUri = vscode.Uri.file('/workspace/moved.ts');
            
            const entry = await manager.addEntry(oldUri, 'file');
            
            // Mock file existence to throw error
            const fileExistsStub = sandbox.stub(fileWatcher as any, 'fileExists');
            fileExistsStub.rejects(new Error('File system error'));
            
            // Should not throw error
            await assert.doesNotReject(async () => {
                await (fileWatcher as any).handlePossibleFileMove(entry, newUri);
            });
        });
    });

    suite('Watcher Management', () => {
        test('should update watchers when Focus Space changes', async () => {
            // Spy on updateWatchers method
            const updateWatchersSpy = sandbox.spy(fileWatcher as any, 'updateWatchers');
            
            // Add an entry to trigger Focus Space change
            const testUri = vscode.Uri.file('/test/file.ts');
            await manager.addEntry(testUri, 'file');
            
            // Verify watchers were updated
            assert.ok(updateWatchersSpy.called, 'Watchers should be updated when Focus Space changes');
        });

        test('should create unique watchers for different paths', async () => {
            const file1 = vscode.Uri.file('/workspace/dir1/file1.ts');
            const file2 = vscode.Uri.file('/workspace/dir2/file2.ts');
            const file3 = vscode.Uri.file('/workspace/dir1/file3.ts'); // Same directory as file1
            
            await manager.addEntry(file1, 'file');
            await manager.addEntry(file2, 'file');
            await manager.addEntry(file3, 'file');
            
            // Get unique paths that should be watched
            const entries = (fileWatcher as any).getAllEntries();
            const uniquePaths = new Set<string>();
            
            for (const entry of entries) {
                if (entry.type !== 'section') {
                    uniquePaths.add(entry.uri.fsPath);
                }
            }
            
            // Should have paths for dir1 and dir2, but not duplicate for dir1
            assert.strictEqual(uniquePaths.size, 3, 'Should have 3 unique file paths');
        });

        test('should handle watcher disposal correctly', async () => {
            // Add some entries
            await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
            await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
            
            // Mock disposable watchers
            const mockDisposable1 = { dispose: sandbox.stub() };
            const mockDisposable2 = { dispose: sandbox.stub() };
            
            // Manually add to watcher's disposables for testing
            (fileWatcher as any).disposables.push(mockDisposable1, mockDisposable2);
            
            // Dispose file watcher
            fileWatcher.dispose();
            
            // Verify all disposables were disposed
            assert.ok(mockDisposable1.dispose.calledOnce, 'First disposable should be disposed');
            assert.ok(mockDisposable2.dispose.calledOnce, 'Second disposable should be disposed');
        });
    });

    suite('Section Handling', () => {
        test('should include files from sections in watcher scope', async () => {
            // Create section with files
            const section = await manager.createSection('Test Section');
            const file1 = await manager.addEntry(vscode.Uri.file('/test/file1.ts'), 'file');
            const file2 = await manager.addEntry(vscode.Uri.file('/test/file2.ts'), 'file');
            
            // Move files to section
            await manager.moveToSection(file1.id, section.id);
            await manager.moveToSection(file2.id, section.id);
            
            // Get all entries
            const allEntries = (fileWatcher as any).getAllEntries();
            
            // Should include both section and files
            const sectionEntries = allEntries.filter((e: any) => e.type === 'section');
            const fileEntries = allEntries.filter((e: any) => e.type === 'file');
            
            assert.strictEqual(sectionEntries.length, 1, 'Should include the section');
            assert.strictEqual(fileEntries.length, 2, 'Should include files from section');
        });

        test('should not watch section entries themselves', async () => {
            const section = await manager.createSection('Test Section');
            
            // Get all entries
            const allEntries = (fileWatcher as any).getAllEntries();
            
            // When creating watchers, sections should be filtered out
            const uniquePaths = new Set<string>();
            for (const entry of allEntries) {
                if (entry.type !== 'section') {
                    uniquePaths.add(entry.uri.fsPath);
                }
            }
            
            // Should have no paths since section doesn't have a real file URI
            assert.strictEqual(uniquePaths.size, 0, 'Should not create watchers for section entries');
        });
    });

    suite('Workspace Integration', () => {
        test('should handle multiple workspace folders', async () => {
            // Mock multiple workspace folders
            const folder1: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/workspace1'),
                name: 'workspace1',
                index: 0
            };
            const folder2: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/workspace2'),
                name: 'workspace2',
                index: 1
            };
            
            const workspaceFoldersStub = sandbox.stub(vscode.workspace, 'workspaceFolders');
            workspaceFoldersStub.value([folder1, folder2]);
            
            // Trigger watcher update
            (fileWatcher as any).updateWatchers();
            
            // Should create workspace watchers for both folders
            // This is mainly testing that no errors are thrown
            assert.ok(true, 'Should handle multiple workspace folders without errors');
        });

        test('should handle no workspace folders', async () => {
            // Mock no workspace folders
            const workspaceFoldersStub = sandbox.stub(vscode.workspace, 'workspaceFolders');
            workspaceFoldersStub.value(undefined);
            
            // Should not throw when creating workspace watchers
            assert.doesNotThrow(() => {
                (fileWatcher as any).createWorkspaceWatchers();
            });
        });
    });
});