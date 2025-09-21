import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Focus Space extension is now active!');
    
    // Show a notification to confirm it's running
    vscode.window.showInformationMessage('Focus Space extension activated successfully!');
    
    // Register a simple command to test activation
    const disposable = vscode.commands.registerCommand('focusSpace.test', () => {
        vscode.window.showInformationMessage('Focus Space extension is working!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Focus Space extension is deactivated');
}