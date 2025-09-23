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
    
    // Use a reliable test directory in system temp
    const testRoot = path.join(os.tmpdir(), 'focus-space-test');
    
    // Create required test directories (relative to test root)
    const testDirs = [
        'test',
        'test/folder',
        'test/src',
        'test/empty-folder',
        'test/project',
        'test/my-project',
        'test/auto-convert-folder',
        'test/convert-folder',
        'test/reveal-folder',
        'project/src'
    ];

    // Create test directories in temp location
    testDirs.forEach(dirName => {
        try {
            const fullPath = path.join(testRoot, dirName);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        } catch (error) {
            console.warn(`Could not create test directory ${dirName}:`, error);
        }
    });

    // Also create the absolute paths for backwards compatibility with existing tests
    const absoluteDirs = [
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

    absoluteDirs.forEach(dir => {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        } catch (error) {
            // If absolute path creation fails, create symbolic link to temp directory
            try {
                const relativePath = dir.replace(/^\//, '');
                const targetPath = path.join(testRoot, relativePath);
                if (fs.existsSync(targetPath) && !fs.existsSync(dir)) {
                    const parentDir = path.dirname(dir);
                    if (!fs.existsSync(parentDir)) {
                        fs.mkdirSync(parentDir, { recursive: true });
                    }
                    fs.symlinkSync(targetPath, dir, 'dir');
                }
            } catch (linkError) {
                console.warn(`Could not create test directory ${dir}:`, error);
            }
        }
    });

    // Create required test files
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
            // Create in temp directory as fallback
            try {
                const tempFilePath = path.join(testRoot, filePath.replace(/^\//, ''));
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
                const tempFilePath = path.join(testRoot, filePath.replace(/^\//, ''));
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
    
    // Clean up absolute test directories if they exist
    const testDirs = [
        '/test',
        '/project'
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

    // Clean up temp directory
    try {
        const testRoot = path.join(os.tmpdir(), 'focus-space-test');
        if (fs.existsSync(testRoot)) {
            fs.rmSync(testRoot, { recursive: true, force: true });
        }
    } catch (error) {
        console.warn('Could not cleanup temp test directory:', error);
    }

    // Clean up workspace test files
    try {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        const workspaceTestFiles = [
            path.join(workspaceRoot, 'test-editor-file.txt'),
            path.join(workspaceRoot, 'temp-file.txt'),
            path.join(workspaceRoot, 'large-file.txt')
        ];
        
        workspaceTestFiles.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    } catch (error) {
        console.warn('Could not cleanup workspace test files:', error);
    }
    
    console.log('Test environment cleanup completed');
}