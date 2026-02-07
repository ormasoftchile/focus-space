# Research: Quick Win Polish

**Feature**: 001-quick-win-polish
**Date**: 2026-02-07
**Status**: Complete — all unknowns resolved

## R1: Tab Groups API for "Add All Open Editors"

**Decision**: Use `vscode.window.tabGroups.all` with `instanceof TabInputText` filtering.

**Rationale**: The Tab Groups API was finalized in VS Code 1.67 (April 2022). The project's engine target `^1.74.0` is well above this threshold — no version bump needed.

**Key findings**:
- `tab.input instanceof vscode.TabInputText` → regular file tabs with `.uri` property
- `TabInputWebview`, `TabInputTerminal` → no URI (skip)
- `TabInputTextDiff` → diff views (skip — not regular files)
- Untitled docs have `untitled:` scheme on their URI — filter via `uri.scheme === 'file'`
- Deduplication needed: same file can be open in multiple groups

**Alternatives considered**:
- `vscode.workspace.textDocuments` — includes non-visible docs, misses non-text tabs
- `vscode.window.visibleTextEditors` — only visible editors, not all tabs

---

## R2: Git Extension API for "Create from Git Changes"

**Decision**: Use `vscode.extensions.getExtension<GitExtension>('vscode.git')` to access the built-in Git extension API.

**Rationale**: The Git extension ships with VS Code and provides `repository.state.workingTreeChanges`, `.indexChanges`, and `.mergeChanges`. This is the standard pattern used by the VS Code team and community extensions. A `.d.ts` type file is copied into the project (not a runtime dependency).

**Key findings**:
- `repository.state.workingTreeChanges` → unstaged modified/deleted files
- `repository.state.indexChanges` → staged changes
- `repository.state.mergeChanges` → merge conflicts
- Each `Change` has `.uri: Uri` and `.status: Status`
- Must call `gitExtension.activate()` if not yet active
- `api.repositories[0]` works for single-root; for multi-root, match by workspace folder URI

**Alternatives considered**:
- Spawning `git status --porcelain` via `child_process` — adds complexity, no advantage since Git extension is always bundled
- `vscode.scm` API — for building SCM providers, not consuming the Git extension

---

## R3: StatusBarItem Best Practices

**Decision**: Create once with string ID overload, use `show()`/`hide()` to toggle, wire `command` property for click.

**Rationale**: `StatusBarItem` is lightweight and designed for show/hide toggling. Creating once and disposing on deactivation is the canonical pattern. The string ID overload allows users to reorder/hide via right-click context menu.

**Key findings**:
- `createStatusBarItem('focusSpace.indicator', StatusBarAlignment.Left, 0)` — left-aligned, low priority (stays out of the way)
- `statusBarItem.command = 'focusSpace.revealView'` — fires on click
- `$(list-unordered)` codicon syntax works in `.text`
- `show()`/`hide()` is preferred over create/dispose — retains configuration state

**Alternatives considered**:
- `ProgressLocation.Window` — transient only, not for persistent indicators
- Language status items — language-scoped, not general purpose

---

## R4: FileSystemWatcher Create/Delete Event Correlation

**Decision**: The existing `workspace.onDidRenameFiles` handler is sufficient for VS Code-initiated renames. For external renames (terminal `mv`), add a lightweight detection window that correlates delete+create events by filename within 300ms.

**Rationale**: `onDidRenameFiles` fires a single event for folder renames done through VS Code's UI or `workspace.fs.rename()`, including recursive child path updates. However, it does **not** fire for external renames (e.g., `mv` in terminal, another application). The existing `FileSystemWatcher` already handles file-level deletions and creations separately, but doesn't correlate them.

**Key findings**:
- VS Code Explorer rename → `onDidRenameFiles` fires once (covers folder + children) ✅
- Terminal `mv` → only `onDidCreate` + `onDidDelete` fire, no rename event ❌
- Detection window approach: buffer `onDidDelete` events for 300ms; if a matching `onDidCreate` arrives (same basename, parent changed), treat as rename
- 300ms is conservative — file system events typically arrive within 10-50ms
- Make the window configurable via `focusSpace.renameDetectionWindowMs` setting

**Alternatives considered**:
- Polling with `workspace.fs.stat()` — expensive, unnecessary
- Ignoring external renames entirely — would cause data loss, violates Principle IV

---

## R5: Token Estimation for Copilot Context

**Decision**: Use 4 chars/token estimation, null-byte check for binary detection, `ProgressLocation.Notification` for progress feedback.

**Rationale**: Copilot Chat's effective context for extension contributions is conservatively ~60K-80K tokens. Using 4 chars/token is a well-validated approximation for code (English prose averages 4-5 chars/token with GPT tokenizers; code is similar due to keyword/identifier tokenization).

**Key findings**:
- Conservative budget: 60,000 tokens × 4 chars = 240,000 characters of file content
- Binary detection: null byte in first 512 bytes → skip file
- Individual file cap: 50,000 chars (truncate with notice)
- Very large files (>1MB): skip entirely
- `vscode.window.withProgress({ location: ProgressLocation.Notification, cancellable: true })` for user feedback
- Progress is reported per-file with `increment: 100 / totalFiles`

**Alternatives considered**:
- `tiktoken` WASM tokenizer — adds ~2MB runtime dependency (violates zero-dependency constraint)
- Byte-based estimation without char conversion — less accurate, chars/token is more intuitive
- `ProgressLocation.Window` (status bar) — no cancel button, no discrete progress indication

**Recommended constants**:
```
CHARS_PER_TOKEN = 4
MAX_CONTEXT_TOKENS = 60,000
MAX_CONTEXT_CHARS = 240,000
MAX_SINGLE_FILE_CHARS = 50,000
BINARY_CHECK_BYTES = 512
MAX_FILE_SIZE_BYTES = 1,048,576 (1MB)
```
