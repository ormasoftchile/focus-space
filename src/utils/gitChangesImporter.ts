import * as vscode from 'vscode';

/**
 * Result of collecting Git changes for Focus Space import.
 */
export interface GitChangesResult {
    changedUris: vscode.Uri[];
    gitUnavailable: boolean;
    noChanges: boolean;
}

/**
 * Git change status values from the built-in Git extension API.
 * Status 6 = DELETED in the Git extension's Status enum.
 */
const GIT_STATUS_DELETED = 6;

/**
 * Collect changed file URIs from the current Git working tree.
 *
 * Gathers URIs from workingTreeChanges, indexChanges, and mergeChanges,
 * deduplicates them, and filters out deleted files.
 */
export async function getGitChanges(): Promise<GitChangesResult> {
    // 1. Get Git extension
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
        return { changedUris: [], gitUnavailable: true, noChanges: false };
    }

    // 2. Activate if needed
    if (!gitExtension.isActive) {
        try {
            await gitExtension.activate();
        } catch {
            return { changedUris: [], gitUnavailable: true, noChanges: false };
        }
    }

    // 3. Get API v1
    const git = gitExtension.exports.getAPI(1);
    if (!git || git.repositories.length === 0) {
        return { changedUris: [], gitUnavailable: true, noChanges: false };
    }

    // 4. Pick repository matching current workspace folder, or first
    let repo = git.repositories[0];
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const match = git.repositories.find(
            (r: any) => r.rootUri.toString() === workspaceFolder.uri.toString()
        );
        if (match) {
            repo = match;
        }
    }

    // 5. Collect URIs from all change sources
    const seenUris = new Set<string>();
    const changedUris: vscode.Uri[] = [];

    const changeSources = [
        repo.state.workingTreeChanges,
        repo.state.indexChanges,
        repo.state.mergeChanges,
    ];

    for (const changes of changeSources) {
        if (!changes) { continue; }
        for (const change of changes) {
            // Skip deleted files
            if (change.status === GIT_STATUS_DELETED) {
                continue;
            }

            const uri = change.uri;
            const key = uri.toString();
            if (!seenUris.has(key)) {
                seenUris.add(key);
                changedUris.push(uri);
            }
        }
    }

    if (changedUris.length === 0) {
        return { changedUris: [], gitUnavailable: false, noChanges: true };
    }

    return { changedUris, gitUnavailable: false, noChanges: false };
}
