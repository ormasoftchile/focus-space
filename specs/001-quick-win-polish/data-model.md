# Data Model: Quick Win Polish

**Feature**: 001-quick-win-polish
**Date**: 2026-02-07

## Existing Entities (no changes)

### FocusEntry
The core entity is unchanged. All new features operate on the existing `FocusEntry` interface:

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | UUID |
| uri | `vscode.Uri` | File/folder path or `focus-section://` scheme |
| type | `'file' \| 'folder' \| 'section'` | Entry category |
| label | `string?` | Custom display name |
| isExpanded | `boolean?` | UI expansion state |
| children | `FocusEntry[]?` | Child entries for sections/folders |
| metadata | `FocusEntryMetadata?` | Timestamps, order, git status |

No schema changes. No migration needed.

---

## New Entities

### StatusBarState

Ephemeral state (not persisted). Derived from `FocusEntry[]` on every `onDidChange` event.

| Field | Type | Description |
|-------|------|-------------|
| fileCount | `number` | Total file-type entries across all sections (flat count) |
| isVisible | `boolean` | `fileCount > 0` |

**Relationships**: Computed from `TreeOperations.flatten(rootEntries).filter(e => e.type === 'file').length`.
**Validation**: `fileCount >= 0`. No upper bound (the `maxItemCount` warning is separate).
**State transitions**: `hidden → visible` when first file added; `visible → hidden` when last file removed.

---

### TokenBudgetResult

Ephemeral (computed during Copilot context building). Not persisted.

| Field | Type | Description |
|-------|------|-------------|
| includedFiles | `FileContentResult[]` | Files that fit within the token budget |
| excludedCount | `number` | Files skipped due to budget exhaustion |
| skippedBinary | `number` | Files skipped because they are binary |
| skippedMissing | `number` | Files skipped because they no longer exist on disk |
| totalTokensEstimated | `number` | Approximate token count of included content |
| budgetUsedPercent | `number` | `totalTokensEstimated / maxTokens * 100` |

### FileContentResult

| Field | Type | Description |
|-------|------|-------------|
| uri | `vscode.Uri` | File URI |
| relativePath | `string` | Workspace-relative path for display |
| content | `string` | UTF-8 text content |
| language | `string` | Language identifier for syntax highlighting |
| charCount | `number` | Length of content |
| estimatedTokens | `number` | `charCount / 4` |
| wasTruncated | `boolean` | True if content exceeded `MAX_SINGLE_FILE_CHARS` |

---

### RenameCandidate

Ephemeral (lives in a Map during the detection window). Not persisted.

| Field | Type | Description |
|-------|------|-------------|
| deletedUri | `vscode.Uri` | The URI that was reported deleted |
| basename | `string` | Filename portion for matching |
| timestamp | `number` | `Date.now()` when the delete event was received |
| affectedEntryIds | `string[]` | Focus Space entry IDs whose URIs start with `deletedUri.fsPath` |

**State transitions**:
1. `onDidDelete` fires → `RenameCandidate` created, timer started (300ms)
2. Within window: `onDidCreate` with matching basename → treated as rename → candidate consumed, entries updated
3. Window expires: no match → treated as genuine delete → entries removed per existing behavior

---

### GitChangesResult

Ephemeral (computed when command runs). Not persisted.

| Field | Type | Description |
|-------|------|-------------|
| changedUris | `vscode.Uri[]` | Deduplicated URIs from working tree + index changes |
| addedCount | `number` | Files added to Focus Space |
| skippedDuplicate | `number` | Files already in Focus Space |
| skippedExcluded | `number` | Files matching exclude patterns |
| gitUnavailable | `boolean` | True if Git extension or repo not found |

---

## New Configuration Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `focusSpace.copilotTokenBudget` | `number` | `60000` | Maximum estimated tokens for Copilot context |
| `focusSpace.renameDetectionWindowMs` | `number` | `300` | Time window (ms) to correlate create/delete events as a rename |

These extend the existing `focusSpace.*` namespace. No migration needed — defaults apply when settings are absent.
