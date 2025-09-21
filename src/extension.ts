import * as vscode from 'vscode';
import { FocusSpaceManager } from './managers/focusSpaceManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Focus Space extension is now active!');
    
    // Show a notification to confirm it's running
    vscode.window.showInformationMessage('Focus Space extension activated successfully!');
    
    // Initialize the FocusSpaceManager
    const manager = FocusSpaceManager.getInstance(context);
    
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

    context.subscriptions.push(disposable, testDataCommand);
}

export function deactivate() {
    console.log('Focus Space extension is deactivated');
}