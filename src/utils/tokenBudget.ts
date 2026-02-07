import * as vscode from 'vscode';
import * as path from 'path';
import { FocusEntry } from '../models/focusEntry';

/**
 * Constants for token budget estimation and file size limits.
 */
const CHARS_PER_TOKEN = 4;
const MAX_SINGLE_FILE_CHARS = 50_000;
const BINARY_CHECK_BYTES = 512;
const MAX_FILE_SIZE_BYTES = 1_048_576; // 1 MB

/**
 * Result of reading and preparing a single file's content for Copilot context.
 */
export interface FileContentResult {
    uri: vscode.Uri;
    relativePath: string;
    content: string;
    language: string;
    charCount: number;
    estimatedTokens: number;
    wasTruncated: boolean;
}

/**
 * Aggregated result of building a token-budgeted context from Focus Space entries.
 */
export interface TokenBudgetResult {
    includedFiles: FileContentResult[];
    excludedCount: number;
    skippedBinary: number;
    skippedMissing: number;
    totalTokensEstimated: number;
    budgetUsedPercent: number;
}

/**
 * Detect the language identifier from a file extension for syntax highlighting.
 */
function detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    const map: Record<string, string> = {
        ts: 'typescript', js: 'javascript', jsx: 'jsx', tsx: 'tsx',
        py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
        go: 'go', rs: 'rust', php: 'php', rb: 'ruby', swift: 'swift',
        kt: 'kotlin', scala: 'scala', json: 'json', xml: 'xml',
        html: 'html', css: 'css', scss: 'scss', md: 'markdown',
        yaml: 'yaml', yml: 'yaml', sh: 'bash', bash: 'bash',
        sql: 'sql', r: 'r', lua: 'lua', dart: 'dart',
    };
    return map[ext] || '';
}

/**
 * Check if content appears to be binary by scanning for null bytes in the first N bytes.
 */
function isBinaryContent(buffer: Uint8Array): boolean {
    const checkLength = Math.min(buffer.length, BINARY_CHECK_BYTES);
    for (let i = 0; i < checkLength; i++) {
        if (buffer[i] === 0) {
            return true;
        }
    }
    return false;
}

/**
 * Build a token-budgeted context from a list of file entries.
 *
 * Reads each file, skips binary/missing/oversized files, estimates tokens,
 * and stops including files once the budget is exhausted.
 *
 * @param entries - Flat array of file-type FocusEntry objects
 * @param maxTokens - Maximum token budget
 * @param token - Optional cancellation token for progress support
 */
export async function buildContext(
    entries: FocusEntry[],
    maxTokens: number,
    token?: vscode.CancellationToken,
): Promise<TokenBudgetResult> {
    const result: TokenBudgetResult = {
        includedFiles: [],
        excludedCount: 0,
        skippedBinary: 0,
        skippedMissing: 0,
        totalTokensEstimated: 0,
        budgetUsedPercent: 0,
    };

    for (const entry of entries) {
        if (token?.isCancellationRequested) {
            break;
        }

        // 1. Check existence and size
        let stat: vscode.FileStat;
        try {
            stat = await vscode.workspace.fs.stat(entry.uri);
        } catch {
            result.skippedMissing++;
            continue;
        }

        if (stat.size > MAX_FILE_SIZE_BYTES) {
            result.excludedCount++;
            continue;
        }

        // 2. Read content
        let rawBytes: Uint8Array;
        try {
            rawBytes = await vscode.workspace.fs.readFile(entry.uri);
        } catch {
            result.skippedMissing++;
            continue;
        }

        // 3. Binary check
        if (isBinaryContent(rawBytes)) {
            result.skippedBinary++;
            continue;
        }

        // 4. Decode and optionally truncate
        let content = Buffer.from(rawBytes).toString('utf-8');
        let wasTruncated = false;
        if (content.length > MAX_SINGLE_FILE_CHARS) {
            content = content.substring(0, MAX_SINGLE_FILE_CHARS);
            wasTruncated = true;
        }

        // 5. Estimate tokens
        const estimatedTokens = Math.ceil(content.length / CHARS_PER_TOKEN);

        // 6. Check budget
        if (result.totalTokensEstimated + estimatedTokens > maxTokens) {
            result.excludedCount++;
            continue;
        }

        // 7. Include file
        const relativePath = vscode.workspace.asRelativePath(entry.uri);
        result.includedFiles.push({
            uri: entry.uri,
            relativePath,
            content,
            language: detectLanguage(entry.uri.fsPath),
            charCount: content.length,
            estimatedTokens,
            wasTruncated,
        });

        result.totalTokensEstimated += estimatedTokens;
    }

    result.budgetUsedPercent = maxTokens > 0
        ? Math.round((result.totalTokensEstimated / maxTokens) * 100)
        : 0;

    return result;
}
