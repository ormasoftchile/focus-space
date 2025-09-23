import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';

/**
 * Global test setup that creates required test directories and files
 * This ensures all tests have the necessary file system structure
 */
export function setupTestEnvironment(): void {
    console.log('Setting up test environment...');
    
    // Create required test directories (absolute paths)
    const testDirs = [
        '/test',
        '/test/folder',
        '/test/src',
        '/test/empty-folder',
        '/test/project',
        '/test/my-project',
        '/test/auto-convert-folder',
        '/test/convert-folder',
        '/test/reveal-folder',
        '/project/src'
    ];

    // Try to create absolute paths first, fallback to temp directory
    testDirs.forEach(dir => {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        } catch (error) {
            // If absolute path creation fails (permissions), try in temp directory
            try {
                const tempDir = path.join(os.tmpdir(), 'focus-space-test', dir.replace(/^\//, ''));
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
            } catch (tempError) {
                console.warn(`Could not create test directory ${dir}:`, tempError);
            }
        }
    });

    // Create required test files (absolute paths)
    const testFiles = [
        { path: '/test/file.ts', content: 'export const test = "test";' },
        { path: '/test/renamed.ts', content: 'export const renamed = "renamed";' },
        { path: '/test/external-file.ts', content: 'export const external = "file";' },
        { path: '/test/external-to-section.ts', content: 'export const external = "section";' },
        { path: '/test/existing.ts', content: 'export const existing = "file";' },
        { path: '/test/valid.ts', content: 'export const valid = "file";' }
    ];

    testFiles.forEach(({ path: filePath, content }) => {
        try {
            // Ensure directory exists first
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, content);
            }
        } catch (error) {
            // If absolute path creation fails, try in temp directory
            try {
                const tempFilePath = path.join(os.tmpdir(), 'focus-space-test', filePath.replace(/^\//, ''));
                const tempDir = path.dirname(tempFilePath);
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                if (!fs.existsSync(tempFilePath)) {
                    fs.writeFileSync(tempFilePath, content);
                }
            } catch (tempError) {
                console.warn(`Could not create test file ${filePath}:`, tempError);
            }
        }
    });

    // Create test files with folder content to satisfy folder tests
    const folderTestFiles = [
        { path: '/test/external-folder/index.ts', content: 'export const index = "external";' },
        { path: '/test/folder/file1.ts', content: 'export const file1 = "test";' },
        { path: '/test/folder/file2.ts', content: 'export const file2 = "test";' },
        { path: '/test/src/main.ts', content: 'export const main = "app";' },
        { path: '/test/project/app.ts', content: 'export const app = "project";' },
        { path: '/test/my-project/index.ts', content: 'export const index = "project";' },
        { path: '/project/src/component.ts', content: 'export const component = "comp";' }
    ];

    folderTestFiles.forEach(({ path: filePath, content }) => {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, content);
            }
        } catch (error) {
            try {
                const tempFilePath = path.join(os.tmpdir(), 'focus-space-test', filePath.replace(/^\//, ''));
                const tempDir = path.dirname(tempFilePath);
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                if (!fs.existsSync(tempFilePath)) {
                    fs.writeFileSync(tempFilePath, content);
                }
            } catch (tempError) {
                console.warn(`Could not create test file ${filePath}:`, tempError);
            }
        }
    });

    // Create workspace-relative test files if workspace is available
    try {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        const workspaceTestFile = path.join(workspaceRoot, 'test-editor-file.txt');
        
        if (!fs.existsSync(workspaceTestFile)) {
            fs.writeFileSync(workspaceTestFile, 'Test file content for editor integration');
        }
    } catch (error) {
        console.warn('Could not create workspace test files:', error);
    }

    console.log('Test environment setup completed');
}

/**
 * Cleanup test environment (optional)
 */
export function cleanupTestEnvironment(): void {
    console.log('Cleaning up test environment...');
    
    // Optionally clean up created test files and directories
    const testDirs = [
        '/test'
    ];

    testDirs.forEach(dir => {
        try {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        } catch (error) {
            // Cleanup is optional, don't fail tests if it doesn't work
            console.warn(`Could not cleanup test directory ${dir}:`, error);
        }
    });

    // Clean up workspace test files
    try {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        const workspaceTestFile = path.join(workspaceRoot, 'test-editor-file.txt');
        
        if (fs.existsSync(workspaceTestFile)) {
            fs.unlinkSync(workspaceTestFile);
        }
    } catch (error) {
        console.warn('Could not cleanup workspace test files:', error);
    }
    
    console.log('Test environment cleanup completed');
}