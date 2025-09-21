import * as vscode from 'vscode';

/**
 * Tracks the active editor and provides notifications when active files change.
 * Used by Focus Space to implement smart reveal behavior and visual highlighting.
 */
export class ActiveEditorTracker {
    private _disposables: vscode.Disposable[] = [];
    private _onDidChangeActiveEditor = new vscode.EventEmitter<vscode.TextEditor | undefined>();
    private _onDidChangeActiveFile = new vscode.EventEmitter<vscode.Uri | undefined>();
    
    /**
     * Event fired when the active editor changes
     */
    public readonly onDidChangeActiveEditor = this._onDidChangeActiveEditor.event;
    
    /**
     * Event fired when the active file changes (different from editor - focuses on the file URI)
     */
    public readonly onDidChangeActiveFile = this._onDidChangeActiveFile.event;
    
    constructor() {
        this.setupTracking();
    }
    
    /**
     * Get the currently active editor
     */
    public get activeEditor(): vscode.TextEditor | undefined {
        return vscode.window.activeTextEditor;
    }
    
    /**
     * Get the currently active file URI
     */
    public get activeFileUri(): vscode.Uri | undefined {
        return vscode.window.activeTextEditor?.document.uri;
    }
    
    /**
     * Check if a given URI is the currently active file
     */
    public isActiveFile(uri: vscode.Uri): boolean {
        const activeUri = this.activeFileUri;
        return activeUri ? activeUri.toString() === uri.toString() : false;
    }
    
    /**
     * Setup event listeners for editor changes
     */
    private setupTracking(): void {
        // Track active editor changes
        this._disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                this._onDidChangeActiveEditor.fire(editor);
                this._onDidChangeActiveFile.fire(editor?.document.uri);
            })
        );
        
        // Track when visible editors change (for split view scenarios)
        this._disposables.push(
            vscode.window.onDidChangeVisibleTextEditors(() => {
                // Re-evaluate active file in case of editor group changes
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    this._onDidChangeActiveFile.fire(activeEditor.document.uri);
                }
            })
        );
    }
    
    /**
     * Get all currently visible editor URIs (useful for split editor scenarios)
     */
    public getVisibleFileUris(): vscode.Uri[] {
        return vscode.window.visibleTextEditors
            .map(editor => editor.document.uri)
            .filter((uri, index, array) => {
                // Remove duplicates
                return array.findIndex(u => u.toString() === uri.toString()) === index;
            });
    }
    
    /**
     * Check if a given URI is visible in any editor
     */
    public isVisibleFile(uri: vscode.Uri): boolean {
        return this.getVisibleFileUris().some(visibleUri => 
            visibleUri.toString() === uri.toString()
        );
    }
    
    /**
     * Dispose of all event listeners
     */
    public dispose(): void {
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        this._onDidChangeActiveEditor.dispose();
        this._onDidChangeActiveFile.dispose();
    }
}