import * as vscode from 'vscode';
import { FocusSpaceManager } from './managers/focusSpaceManager';
import { FocusSpaceTreeDataProvider } from './providers/focusSpaceTreeDataProvider';
import { FocusSpaceDragAndDropController } from './controllers/focusSpaceDragAndDropController';
import { ActiveEditorTracker } from './utils/activeEditorTracker';
import { FocusSpaceRevealHandler } from './utils/focusSpaceRevealHandler';
import { FileSystemWatcher } from './utils/fileSystemWatcher';
import { configuration } from './utils/configurationManager';
import { FocusEntry } from './models/focusEntry';
import { TreeOperations } from './utils/treeOperations';

export function activate(context: vscode.ExtensionContext) {
    console.log('Focus Space extension is now active!');
    
    // Initialize the FocusSpaceManager
    const manager = FocusSpaceManager.getInstance(context);
    
    // Initialize the TreeDataProvider
    const treeDataProvider = new FocusSpaceTreeDataProvider(manager);
    
    // Initialize the Drag and Drop Controller
    const dragAndDropController = new FocusSpaceDragAndDropController(manager);
    
    // Register the tree view with drag and drop support
    const treeView = vscode.window.createTreeView('focusSpace', {
        treeDataProvider,
        dragAndDropController,
        showCollapseAll: true
    });
    
    // Initialize the reveal handler
    const revealHandler = new FocusSpaceRevealHandler(manager);
    revealHandler.setTreeView(treeView);
    revealHandler.setupRevealInterception();
    
    // Initialize the file system watcher
    const fileSystemWatcher = FileSystemWatcher.getInstance(manager);
    
    // Update visibility context based on entries and configuration
    const updateVisibilityContext = () => {
        const hasItems = manager.getTopLevelEntries().length > 0;
        const hideWhenEmpty = configuration.hideWhenEmpty;
        
        // Show view if: has items OR (no items but hideWhenEmpty is disabled)
        const shouldShow = hasItems || !hideWhenEmpty;
        
        vscode.commands.executeCommand('setContext', 'focusSpace.hasItems', shouldShow);
    };
    
    // Set initial context
    updateVisibilityContext();
    
    // Update context when data changes
    const changeListener = manager.onDidChange(updateVisibilityContext);
    
    // Listen for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('focusSpace.hideWhenEmpty')) {
            updateVisibilityContext();
        }
    });
    
    // Register a simple command to test activation
    const disposable = vscode.commands.registerCommand('focusSpace.test', () => {
        vscode.window.showInformationMessage('Focus Space extension is working!');
    });

    // Register a test command to verify data persistence
    const testDataCommand = vscode.commands.registerCommand('focusSpace.testData', async () => {
        try {
            // Add a test entry
            const testUri = vscode.Uri.file('/test/sample.ts');
            const entry = await manager.addEntry(testUri, 'file');
            
            // Create a test section
            const section = await manager.createSection('Test Section');
            
            vscode.window.showInformationMessage(`Added entry: ${entry.id} and section: ${section.id}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });

    // Register a command to populate sample data for testing
    const populateTestDataCommand = vscode.commands.registerCommand('focusSpace.populateTestData', async () => {
        try {
            // Clear existing data
            await manager.clearAll();
            
            // Add sample files
            await manager.addEntry(vscode.Uri.file('/project/src/main.ts'), 'file', undefined, 'Main Entry');
            await manager.addEntry(vscode.Uri.file('/project/src/utils.ts'), 'file');
            await manager.addEntry(vscode.Uri.file('/project/docs'), 'folder');
            
            // Create a section with files
            const section = await manager.createSection('Core Components');
            const componentFile = await manager.addEntry(vscode.Uri.file('/project/src/component.tsx'), 'file');
            const serviceFile = await manager.addEntry(vscode.Uri.file('/project/src/service.ts'), 'file');
            
            // Move files to section
            await manager.moveToSection(componentFile.id, section.id);
            await manager.moveToSection(serviceFile.id, section.id);
            
            vscode.window.showInformationMessage('Sample data populated in Focus Space! Check the Explorer panel.');
        } catch (error) {
            vscode.window.showErrorMessage(`Error populating test data: ${error}`);
        }
    });

    // Register a command to clear all data for testing auto-hide
    const clearDataCommand = vscode.commands.registerCommand('focusSpace.clearAllData', async () => {
        try {
            await manager.clearAll();
            vscode.window.showInformationMessage('Focus Space cleared! Panel should auto-hide if configured.');
        } catch (error) {
            vscode.window.showErrorMessage(`Error clearing data: ${error}`);
        }
    });

    // Register command to add files/folders to Focus Space
    const addToFocusSpaceCommand = vscode.commands.registerCommand('focusSpace.addToFocusSpace', async (uri?: vscode.Uri, uris?: vscode.Uri[]) => {
        try {
            let urisToAdd: vscode.Uri[] = [];

            // Handle multiple selection (uris parameter) or single selection (uri parameter)
            if (uris && uris.length > 0) {
                urisToAdd = uris;
            } else if (uri) {
                urisToAdd = [uri];
            } else {
                // If no URI provided (e.g., from Command Palette), try to get selected files from Explorer
                // This is a workaround since VS Code doesn't provide direct access to explorer selection
                try {
                    const explorerSelection = await vscode.commands.executeCommand('vscode.explorer.getSelection') as vscode.Uri[] | undefined;
                    if (explorerSelection && explorerSelection.length > 0) {
                        urisToAdd = explorerSelection;
                    } else {
                        throw new Error('No explorer selection');
                    }
                } catch {
                    // Fall back to active editor or show file picker
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor) {
                        urisToAdd = [activeEditor.document.uri];
                    } else {
                        // Show file picker as last resort
                        const selectedFiles = await vscode.window.showOpenDialog({
                            canSelectMany: true,
                            canSelectFiles: true,
                            canSelectFolders: true,
                            openLabel: 'Add to Focus Space',
                            title: 'Select files or folders to add to Focus Space'
                        });
                        
                        if (selectedFiles && selectedFiles.length > 0) {
                            urisToAdd = selectedFiles;
                        } else {
                            vscode.window.showInformationMessage('No files selected. You can right-click files in Explorer or open a file in the editor to add to Focus Space.');
                            return;
                        }
                    }
                }
            }

            let addedCount = 0;
            let duplicateCount = 0;
            const addedNames: string[] = [];

            for (const targetUri of urisToAdd) {
                // Check if already exists
                if (manager.hasEntry(targetUri)) {
                    duplicateCount++;
                    continue;
                }

                // Determine type (file or folder) by checking if it's a directory
                let type: 'file' | 'folder' = 'file';
                try {
                    const stat = await vscode.workspace.fs.stat(targetUri);
                    type = (stat.type & vscode.FileType.Directory) ? 'folder' : 'file';
                } catch {
                    // Default to file if can't determine
                    type = 'file';
                }

                // Add to Focus Space
                await manager.addEntry(targetUri, type);
                addedCount++;
                const fileName = targetUri.fsPath.split('/').pop() || targetUri.fsPath;
                addedNames.push(fileName);
            }

            // Detect context for better user feedback
            const isActiveEditorFile = !uri && !uris && urisToAdd.length === 1 && 
                vscode.window.activeTextEditor && 
                urisToAdd[0].toString() === vscode.window.activeTextEditor.document.uri.toString();

            // Show appropriate message based on results
            if (addedCount > 0 && duplicateCount === 0) {
                if (addedCount === 1) {
                    const contextMessage = isActiveEditorFile ? " (current file)" : "";
                    vscode.window.showInformationMessage(`Added "${addedNames[0]}"${contextMessage} to Focus Space.`);
                } else {
                    vscode.window.showInformationMessage(`Added ${addedCount} items to Focus Space.`);
                }
            } else if (addedCount > 0 && duplicateCount > 0) {
                vscode.window.showInformationMessage(`Added ${addedCount} items to Focus Space. ${duplicateCount} items were already present.`);
            } else if (duplicateCount > 0) {
                if (duplicateCount === 1) {
                    const fileName = urisToAdd[0].fsPath.split('/').pop() || urisToAdd[0].fsPath;
                    const contextMessage = isActiveEditorFile ? " (current file)" : "";
                    vscode.window.showInformationMessage(`"${fileName}"${contextMessage} is already in Focus Space.`);
                } else {
                    vscode.window.showInformationMessage(`All ${duplicateCount} selected items are already in Focus Space.`);
                }
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error adding to Focus Space: ${error}`);
        }
    });

    // Register dedicated command for adding files via Command Palette with file picker
    const addFilesToFocusSpaceCommand = vscode.commands.registerCommand('focusSpace.addFilesToFocusSpace', async () => {
        try {
            // Show file picker dialog
            const selectedFiles = await vscode.window.showOpenDialog({
                canSelectMany: true,
                canSelectFiles: true,
                canSelectFolders: true,
                openLabel: 'Add to Focus Space',
                title: 'Select files or folders to add to Focus Space'
            });
            
            if (!selectedFiles || selectedFiles.length === 0) {
                return; // User cancelled
            }

            let addedCount = 0;
            let duplicateCount = 0;
            const addedNames: string[] = [];

            for (const targetUri of selectedFiles) {
                // Check if already exists
                if (manager.hasEntry(targetUri)) {
                    duplicateCount++;
                    continue;
                }

                // Determine type (file or folder) by checking if it's a directory
                let type: 'file' | 'folder' = 'file';
                try {
                    const stat = await vscode.workspace.fs.stat(targetUri);
                    type = (stat.type & vscode.FileType.Directory) ? 'folder' : 'file';
                } catch {
                    // Default to file if can't determine
                    type = 'file';
                }

                // Add to Focus Space
                await manager.addEntry(targetUri, type);
                addedCount++;
                const fileName = targetUri.fsPath.split('/').pop() || targetUri.fsPath;
                addedNames.push(fileName);
            }

            // Show appropriate message based on results
            if (addedCount > 0 && duplicateCount === 0) {
                if (addedCount === 1) {
                    vscode.window.showInformationMessage(`Added "${addedNames[0]}" to Focus Space.`);
                } else {
                    vscode.window.showInformationMessage(`Added ${addedCount} items to Focus Space.`);
                }
            } else if (addedCount > 0 && duplicateCount > 0) {
                vscode.window.showInformationMessage(`Added ${addedCount} items to Focus Space. ${duplicateCount} items were already present.`);
            } else if (duplicateCount > 0) {
                if (duplicateCount === 1) {
                    const fileName = selectedFiles[0].fsPath.split('/').pop() || selectedFiles[0].fsPath;
                    vscode.window.showInformationMessage(`"${fileName}" is already in Focus Space.`);
                } else {
                    vscode.window.showInformationMessage(`All ${duplicateCount} selected items are already in Focus Space.`);
                }
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error adding files to Focus Space: ${error}`);
        }
    });

    // Register command to remove items from Focus Space
    const removeFromFocusSpaceCommand = vscode.commands.registerCommand('focusSpace.removeFromFocusSpace', async (treeItem?: any) => {
        try {
            if (!treeItem) {
                vscode.window.showWarningMessage('No item selected for removal.');
                return;
            }

            // Extract the entry ID - VS Code might pass either TreeItem or FocusEntry directly
            let entryId: string | undefined;
            
            if (treeItem.entryId) {
                // TreeItem case
                entryId = treeItem.entryId;
            } else if (treeItem.id) {
                // FocusEntry case (VS Code passes the element directly)
                entryId = treeItem.id;
            }
            
            if (!entryId) {
                vscode.window.showWarningMessage('Unable to identify item for removal.');
                return;
            }

            // Remove the entry from focus space
            const success = await manager.removeEntry(entryId);
            
            if (success) {
                vscode.window.showInformationMessage('Removed from Focus Space.');
            } else {
                vscode.window.showWarningMessage('Item not found in Focus Space.');
            }

        } catch (error) {
            console.error('Remove command error:', error);
            vscode.window.showErrorMessage(`Error removing from Focus Space: ${error}`);
        }
    });

    // Register command to create a new section
    const createSectionCommand = vscode.commands.registerCommand('focusSpace.createSection', async () => {
        try {
            const sectionName = await vscode.window.showInputBox({
                prompt: 'Enter section name',
                placeHolder: 'e.g., "Core Files", "Testing", "Documentation"',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Section name cannot be empty';
                    }
                    return null;
                }
            });

            if (sectionName) {
                const section = await manager.createSection(sectionName.trim());
                vscode.window.showInformationMessage(`Created section "${sectionName}".`);
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating section: ${error}`);
        }
    });

    // Register command to remove all items from Focus Space
    const removeAllCommand = vscode.commands.registerCommand('focusSpace.removeAll', async () => {
        try {
            const allEntries = manager.getTopLevelEntries();
            if (allEntries.length === 0) {
                vscode.window.showInformationMessage('Focus Space is already empty.');
                return;
            }

            // Count total items including children
            let totalItems = 0;
            for (const entry of allEntries) {
                totalItems++; // Count the entry itself
                if (entry.type === 'section' && entry.children) {
                    totalItems += entry.children.length; // Count children
                }
            }

            const confirmation = await vscode.window.showWarningMessage(
                `Are you sure you want to remove all ${totalItems} item(s) from Focus Space?`,
                { modal: true },
                'Remove All'
            );

            if (confirmation === 'Remove All') {
                await manager.clearAll();
                vscode.window.showInformationMessage('All items removed from Focus Space.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error removing all items: ${error}`);
        }
    });

    // Register command to reveal items in Explorer
    const revealInExplorerCommand = vscode.commands.registerCommand('focusSpace.revealInExplorer', async (treeItem?: any) => {
        try {
            if (!treeItem) {
                vscode.window.showWarningMessage('No item selected for reveal.');
                return;
            }

            const entryId = treeItem.entryId || treeItem.id;
            if (!entryId) {
                vscode.window.showWarningMessage('Unable to identify item for reveal.');
                return;
            }

            const entry = manager.getEntry(entryId);
            if (!entry) {
                vscode.window.showWarningMessage('Item not found in Focus Space.');
                return;
            }

            // Sections can't be revealed since they don't correspond to filesystem items
            if (entry.type === 'section') {
                vscode.window.showWarningMessage('Sections cannot be revealed in Explorer.');
                return;
            }

            // Reveal the file/folder in Explorer
            await vscode.commands.executeCommand('revealInExplorer', entry.uri);
        } catch (error) {
            vscode.window.showErrorMessage(`Error revealing in Explorer: ${error}`);
        }
    });

    // Register command to convert folder to section
    const convertFolderToSectionCommand = vscode.commands.registerCommand('focusSpace.convertFolderToSection', async (treeItem?: any) => {
        try {
            if (!treeItem) {
                vscode.window.showWarningMessage('No folder selected for conversion.');
                return;
            }

            const entryId = treeItem.entryId || treeItem.id;
            if (!entryId) {
                vscode.window.showWarningMessage('Unable to identify folder for conversion.');
                return;
            }

            const entry = manager.getEntry(entryId);
            if (!entry) {
                vscode.window.showWarningMessage('Folder not found in Focus Space.');
                return;
            }

            if (entry.type !== 'folder') {
                vscode.window.showWarningMessage('Only folders can be converted to sections.');
                return;
            }

            const result = await manager.autoConvertFolderToSection(entryId);
            if (result) {
                vscode.window.showInformationMessage(`Converted folder to editable section with ${result.childEntries.length} items.`);
            } else {
                vscode.window.showWarningMessage('Failed to convert folder to section.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error converting folder to section: ${error}`);
        }
    });

    context.subscriptions.push(
        treeView, 
        changeListener, 
        configChangeListener,
        revealHandler,
        disposable, 
        testDataCommand, 
        populateTestDataCommand, 
        clearDataCommand,
        addToFocusSpaceCommand,
        addFilesToFocusSpaceCommand,
        removeFromFocusSpaceCommand,
        createSectionCommand,
        removeAllCommand,
        revealInExplorerCommand,
        convertFolderToSectionCommand,
        fileSystemWatcher
    );
}

export async function deactivate() {
    console.log('Focus Space extension is deactivated');
    
    // Dispose file system watcher
    try {
        const fileSystemWatcher = FileSystemWatcher.getInstance();
        fileSystemWatcher.dispose();
    } catch (error) {
        console.error('Error disposing file system watcher:', error);
    }
    
    // Force save any pending changes before deactivation
    try {
        const manager = FocusSpaceManager.getInstance();
        await manager.saveNow();
    } catch (error) {
        console.error('Error saving on deactivation:', error);
    }
}