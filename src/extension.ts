import * as vscode from 'vscode';
import { FocusSpaceManager } from './managers/focusSpaceManager';
import { FocusSpaceTreeDataProvider } from './providers/focusSpaceTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Focus Space extension is now active!');
    
    // Initialize the FocusSpaceManager
    const manager = FocusSpaceManager.getInstance(context);
    
    // Initialize the TreeDataProvider
    const treeDataProvider = new FocusSpaceTreeDataProvider(manager);
    
    // Register the tree view
    const treeView = vscode.window.createTreeView('focusSpace', {
        treeDataProvider,
        showCollapseAll: true
    });
    
    // Update visibility context based on entries and configuration
    const updateVisibilityContext = () => {
        const hasItems = manager.getTopLevelEntries().length > 0;
        const hideWhenEmpty = vscode.workspace.getConfiguration('focusSpace').get<boolean>('hideWhenEmpty', true);
        
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
        console.log('addToFocusSpace command executed with:', { uri, uris });
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
                    const fileName = urisToAdd[0].fsPath.split('/').pop() || urisToAdd[0].fsPath;
                    vscode.window.showInformationMessage(`"${fileName}" is already in Focus Space.`);
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

            // Extract the entry ID from the TreeItem
            const entryId = treeItem.entryId || treeItem.id;
            if (!entryId) {
                vscode.window.showWarningMessage('Unable to identify item for removal.');
                return;
            }

            const entry = manager.getEntry(entryId);
            if (!entry) {
                vscode.window.showWarningMessage('Item not found in Focus Space.');
                return;
            }

            await manager.removeEntry(entryId);
            const label = entry.label || entry.uri.fsPath.split('/').pop() || 'item';
            vscode.window.showInformationMessage(`Removed "${label}" from Focus Space.`);

        } catch (error) {
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

    context.subscriptions.push(
        treeView, 
        changeListener, 
        configChangeListener, 
        disposable, 
        testDataCommand, 
        populateTestDataCommand, 
        clearDataCommand,
        addToFocusSpaceCommand,
        addFilesToFocusSpaceCommand,
        removeFromFocusSpaceCommand,
        createSectionCommand
    );
}

export function deactivate() {
    console.log('Focus Space extension is deactivated');
}