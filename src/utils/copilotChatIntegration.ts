import * as vscode from 'vscode';
import { FocusEntry } from '../models/focusEntry';
import * as path from 'path';

export class CopilotChatIntegration {
  private static instance: CopilotChatIntegration;
  
  static getInstance(): CopilotChatIntegration {
    if (!CopilotChatIntegration.instance) {
      CopilotChatIntegration.instance = new CopilotChatIntegration();
    }
    return CopilotChatIntegration.instance;
  }

  // Method 1: Direct Copilot commands
  async testCopilotCommands(entries: FocusEntry[], prompt?: string): Promise<boolean> {
    const fileEntries = entries.filter(e => e.type === 'file');
    
    vscode.window.showInformationMessage(
      `🔄 Testing Direct Commands with ${fileEntries.length} files from ${entries.length} entries`
    );

    const commands = [
      'github.copilot.sendToChat',
      'github.copilot.explainThis',
      'workbench.action.chat.openInSidebar'
    ];

    let lastError: any;
    for (const command of commands) {
      try {
        const commandArgs = {
          files: fileEntries.map(e => e.uri),
          prompt: prompt || `Analyze these ${fileEntries.length} files from Focus Space`,
          context: 'focus-space',
          uris: fileEntries.map(e => e.uri)
        };
        
        console.log(`Trying command ${command} with args:`, commandArgs);
        await vscode.commands.executeCommand(command, commandArgs);
        
        vscode.window.showInformationMessage(
          `✅ SUCCESS: ${command} worked with ${fileEntries.length} files!`
        );
        return true;
      } catch (error) {
        lastError = error;
        console.log(`Command ${command} failed:`, error);
        continue;
      }
    }
    
    vscode.window.showErrorMessage(
      `❌ All Direct Commands failed with ${fileEntries.length} files. Last error: ${lastError}`
    );
    return false;
  }

  // Method 2: Workspace file approach
  async testWorkspaceFile(entries: FocusEntry[], prompt?: string): Promise<boolean> {
    const fileEntries = entries.filter(e => e.type === 'file');
    
    vscode.window.showInformationMessage(
      `🔄 Testing Workspace File with ${fileEntries.length} files from ${entries.length} entries`
    );

    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!workspaceRoot) {
        throw new Error('No workspace folder available');
      }

      // Ensure .vscode directory exists
      const vscodeDir = vscode.Uri.joinPath(workspaceRoot, '.vscode');
      try {
        await vscode.workspace.fs.stat(vscodeDir);
      } catch {
        await vscode.workspace.fs.createDirectory(vscodeDir);
      }

      const tempFile = vscode.Uri.joinPath(vscodeDir, 'focus-context.md');
      const content = await this.prepareFocusContext(fileEntries, prompt);
      
      await vscode.workspace.fs.writeFile(tempFile, Buffer.from(content));
      await vscode.window.showTextDocument(tempFile, { preview: false });
      
      // Try to open Copilot Chat
      try {
        await vscode.commands.executeCommand('workbench.action.chat.open');
      } catch {
        // Fallback: try alternative chat commands
        await vscode.commands.executeCommand('workbench.action.chat.openInSidebar');
      }
      
      vscode.window.showInformationMessage(
        `✅ SUCCESS: Created focus-context.md with ${fileEntries.length} files. Check .vscode/ folder!`
      );
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`❌ Workspace file approach failed: ${error}`);
      return false;
    }
  }

  // Method 3: Enhanced clipboard approach
  async testClipboard(entries: FocusEntry[], prompt?: string): Promise<boolean> {
    const fileEntries = entries.filter(e => e.type === 'file');
    
    vscode.window.showInformationMessage(
      `🔄 Testing Clipboard with ${fileEntries.length} files from ${entries.length} entries`
    );

    try {
      const content = await this.prepareFocusContext(fileEntries, prompt);
      await vscode.env.clipboard.writeText(content);
      
      // Try to open Copilot Chat first
      let chatOpened = false;
      try {
        await vscode.commands.executeCommand('workbench.action.chat.open');
        chatOpened = true;
      } catch {
        try {
          await vscode.commands.executeCommand('workbench.action.chat.openInSidebar');
          chatOpened = true;
        } catch {
          // Chat couldn't be opened
        }
      }
      
      const message = chatOpened 
        ? `✅ SUCCESS: ${fileEntries.length} files copied to clipboard and Copilot Chat opened! Paste with Ctrl+V`
        : `✅ SUCCESS: ${fileEntries.length} files copied to clipboard! Open Copilot Chat and paste (Ctrl+V)`;
      
      const action = await vscode.window.showInformationMessage(
        message,
        chatOpened ? 'Done' : 'Try Open Chat',
        'Show Content'
      );
      
      if (action === 'Try Open Chat') {
        try {
          await vscode.commands.executeCommand('github.copilot.openChat');
        } catch {
          vscode.window.showWarningMessage('Could not open Copilot Chat automatically');
        }
      } else if (action === 'Show Content') {
        // Show content in new document for verification
        const doc = await vscode.workspace.openTextDocument({
          content: content,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
      }
      
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`❌ Clipboard approach failed: ${error}`);
      return false;
    }
  }

  private async prepareFocusContext(entries: FocusEntry[], prompt?: string): Promise<string> {
    const lines: string[] = [];
    
    if (prompt) {
      lines.push(`# ${prompt}\n`);
    } else {
      lines.push(`# Focus Space Context (${entries.length} files)\n`);
    }
    
    lines.push(`**Generated at:** ${new Date().toLocaleString()}\n`);
    lines.push('## Files in Focus Space\n');
    
    for (const entry of entries) {
      const fileName = path.basename(entry.uri.fsPath);
      const relativePath = vscode.workspace.asRelativePath(entry.uri);
      
      lines.push(`### ${entry.label || fileName}`);
      lines.push(`**Path:** \`${relativePath}\``);
      lines.push(`**Type:** ${entry.type}\n`);
      
      if (entry.type === 'file') {
        try {
          const content = await vscode.workspace.fs.readFile(entry.uri);
          const text = content.toString();
          
          if (text.length > 50000) { // 50KB limit
            lines.push('```');
            lines.push(`File too large (${Math.round(text.length / 1024)}KB). Content truncated.`);
            lines.push(text.substring(0, 5000) + '\n\n... [truncated] ...');
            lines.push('```\n');
          } else {
            const language = this.detectLanguage(entry.uri.fsPath);
            lines.push('```' + language);
            lines.push(text);
            lines.push('```\n');
          }
        } catch (error) {
          lines.push(`*Could not read file content: ${error}*\n`);
        }
      } else if (entry.type === 'section') {
        lines.push('*Section containing multiple files*\n');
      } else if (entry.type === 'folder') {
        lines.push('*Folder entry*\n');
      }
    }
    
    lines.push('\n---\n');
    lines.push('*Generated by Focus Space extension*');
    
    return lines.join('\n');
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    const languageMap: { [key: string]: string } = {
      'ts': 'typescript',
      'js': 'javascript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'json': 'json',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'md': 'markdown'
    };
    return languageMap[ext] || '';
  }
}