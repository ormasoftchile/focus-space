// Simple test to verify section creation fires tree refresh event
const vscode = require('vscode');

async function testSectionRefresh() {
    try {
        console.log('Testing section creation and tree refresh...');
        
        // Execute the create section command with predefined input
        await vscode.commands.executeCommand('focusSpace.createSection');
        
        console.log('Section creation command executed - check if tree refreshes immediately');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testSectionRefresh();