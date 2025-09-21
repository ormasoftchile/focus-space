import * as vscode from 'vscode';
import { FocusSpaceManager } from './managers/focusSpaceManager';
import { FocusSpaceTreeDataProvider } from './providers/focusSpaceTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Focus Space extension is now active!');
    
    // Show a notification to confirm it's running
    vscode.window.showInformationMessage('Focus Space extension activated successfully!');
    
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

    context.subscriptions.push(treeView, changeListener, configChangeListener, disposable, testDataCommand, populateTestDataCommand, clearDataCommand);
}

export function deactivate() {
    console.log('Focus Space extension is deactivated');
}