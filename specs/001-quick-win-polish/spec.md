# Feature Specification: Quick Win Polish

**Feature Branch**: `001-quick-win-polish`  
**Created**: 2026-02-07  
**Status**: Draft  
**Input**: Extension review analysis identifying 5 high-impact improvements to reach production-ready v1

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Status Bar Indicator (Priority: P1)

A developer working with Focus Space wants ambient awareness of their curated context without looking at the sidebar. The status bar shows a persistent indicator with the number of focused items and a visual "ready" state. Clicking the indicator reveals the Focus Space panel.

**Why this priority**: Lowest implementation risk, highest visibility gain. Every Focus Space user benefits immediately — no workflow change required.

**Independent Test**: Add 3 files to Focus Space → status bar shows "$(target) 3 files" → click it → Focus Space panel gains focus. Remove all files → status bar item disappears.

**Acceptance Scenarios**:

1. **Given** Focus Space has 0 items, **When** the extension activates, **Then** the status bar indicator is hidden.
2. **Given** Focus Space has 5 files across 2 sections, **When** the user looks at the status bar, **Then** it displays the total file count (not section count).
3. **Given** the status bar indicator is visible, **When** the user clicks it, **Then** the Focus Space tree view is revealed and focused.
4. **Given** the user removes the last item from Focus Space, **When** the tree becomes empty, **Then** the status bar indicator disappears.
5. **Given** Focus Space has items, **When** the user opens a workspace where the extension activates, **Then** the status bar indicator appears with the correct count after state is restored.

---

### User Story 2 — Add All Open Editors (Priority: P2)

A developer has 8 tabs open from a debugging session and wants to capture all of them into Focus Space at once instead of adding them one by one. They run the "Add All Open Editors" command, and every open file tab is added to Focus Space in one action.

**Why this priority**: Instant onboarding value — the biggest friction point for new users is populating Focus Space. This eliminates it with a single command.

**Independent Test**: Open 5 files in editor tabs → run "Focus Space: Add All Open Editors" → all 5 appear in Focus Space. Duplicates (already in Focus Space) are silently skipped.

**Acceptance Scenarios**:

1. **Given** 6 editor tabs are open and Focus Space is empty, **When** the user runs "Add All Open Editors", **Then** all 6 files appear in Focus Space.
2. **Given** 4 tabs are open and 2 of them are already in Focus Space, **When** the user runs "Add All Open Editors", **Then** only the 2 new files are added; the existing 2 are not duplicated.
3. **Given** no editor tabs are open, **When** the user runs "Add All Open Editors", **Then** an informational message indicates no open editors were found.
4. **Given** some tabs contain untitled/unsaved documents, **When** the user runs "Add All Open Editors", **Then** untitled documents are skipped (only persisted files are added).
5. **Given** the user has open editors that match exclude patterns (e.g., files in `node_modules`), **When** the user runs "Add All Open Editors", **Then** excluded files are skipped and the user is notified of skipped count.

---

### User Story 3 — Copilot Integration Hardening (Priority: P3)

A developer wants to send their Focus Space context to Copilot Chat reliably. The current implementation has three experimental "test" methods. The hardened version consolidates into a single production command with token-aware content building, progress feedback, and graceful degradation when the Copilot Chat panel is unavailable.

**Why this priority**: The Copilot integration is the extension's differentiator, but it's currently exposed as test commands. Hardening it makes the feature shippable.

**Independent Test**: Add 10 files to Focus Space (mix of small and large) → right-click a section → "Send to Copilot Chat" → progress notification appears → clipboard contains formatted context → Copilot Chat panel opens (or user is told to paste manually if panel command fails).

**Acceptance Scenarios**:

1. **Given** a section with 5 small files (~1KB each), **When** the user sends it to Copilot, **Then** all 5 files are included in the clipboard content with syntax-highlighted code blocks.
2. **Given** a Focus Space with 20 files whose combined content exceeds the configured token budget (default 60,000 tokens ≈ 240,000 characters), **When** the user sends all to Copilot, **Then** the system includes files in order until the budget is reached, skips the remainder, and warns the user how many files were excluded.
3. **Given** the Copilot Chat panel command fails (e.g., Copilot not installed), **When** the user sends context, **Then** the clipboard still contains the formatted content, and the user sees a message explaining how to paste manually.
4. **Given** Focus Space contains only sections and folders (no files), **When** the user attempts to send to Copilot, **Then** an informational message indicates no file content is available to send.
5. **Given** a file in Focus Space has been deleted from disk, **When** the user sends context, **Then** the deleted file is skipped with a note in the output, and remaining files are still sent.

---

### User Story 4 — Create from Git Changes (Priority: P4)

A developer is working on a feature branch and wants to focus on exactly the files they've changed. They run "Add from Git Changes" and Focus Space is populated with all modified, added, and staged files from the current working tree diff.

**Why this priority**: High value for branch-based workflows, but depends on the Git extension being available. Scoped after the core improvements.

**Independent Test**: Create a branch, modify 3 files, stage 1 new file → run "Focus Space: Add from Git Changes" → all 4 files appear in Focus Space. Run again after committing → Focus Space shows the updated diff.

**Acceptance Scenarios**:

1. **Given** the user is on a feature branch with 4 modified files and 1 new file, **When** they run "Add from Git Changes", **Then** all 5 files appear in Focus Space.
2. **Given** the VS Code Git extension is not installed or no repository is detected, **When** the user runs "Add from Git Changes", **Then** an informational message explains the command requires a Git repository.
3. **Given** the user has files in Focus Space already, **When** they run "Add from Git Changes", **Then** changed files are added without duplicating existing entries.
4. **Given** the user is on the default branch with no uncommitted changes, **When** they run "Add from Git Changes", **Then** an informational message indicates no changed files were found.
5. **Given** changed files include files matching exclude patterns, **When** the user runs "Add from Git Changes", **Then** excluded files are skipped.

---

### User Story 5 — Folder Rename Resilience (Priority: P5)

A developer renames a folder (e.g., `src/utils` → `src/helpers`) that contains files tracked in Focus Space. The file system emits `create`/`delete` event pairs (not `rename`). Focus Space detects these pairs within a short time window and updates all affected entries' paths instead of treating them as separate add/remove operations.

**Why this priority**: Data integrity issue — important but rare in practice. Addresses a known gap in file system event handling.

**Independent Test**: Add 3 files from `src/utils/` to Focus Space → rename the folder to `src/helpers/` in Explorer → Focus Space entries update to `src/helpers/` paths with no data loss.

**Acceptance Scenarios**:

1. **Given** Focus Space contains `src/utils/a.ts` and `src/utils/b.ts`, **When** the user renames `src/utils` to `src/helpers`, **Then** both entries update to `src/helpers/a.ts` and `src/helpers/b.ts`.
2. **Given** a folder rename occurs, **When** the create and delete events arrive within the detection window, **Then** they are correlated as a rename (not treated as independent add/remove).
3. **Given** a file is genuinely deleted (no corresponding create), **When** the detection window expires, **Then** the file is removed from Focus Space as it is today.
4. **Given** a new file is genuinely created (no corresponding delete), **When** the detection window expires, **Then** no Focus Space modification occurs (files are not auto-added).
5. **Given** Focus Space contains entries nested 3 levels deep under a renamed folder, **When** the rename occurs, **Then** all nested entries have their paths updated recursively.

---

### Edge Cases

- What happens when the user runs "Add All Open Editors" while a large file is still loading in VS Code?
  - The command waits for the tab group API to return; in-progress loads are included if they have a URI.
- What happens when the Git extension is available but the repository is in a detached HEAD state?
  - "Add from Git Changes" compares against the working tree; detached HEAD still has a diff.
- What happens when a folder rename occurs during a batch persistence save?
  - The rename detection window completes first; the debounced save picks up the final state.
- How does the status bar behave in multi-root workspaces?
  - The status bar shows the aggregate count across all workspace roots.
- What if token estimation is wildly inaccurate for binary files?
  - Binary files (detected by null bytes in the first 512 bytes) are skipped entirely with a note.

## Requirements *(mandatory)*

### Functional Requirements

**Status Bar Indicator**
- **FR-001**: The extension MUST display a status bar item showing the total file count when Focus Space is non-empty.
- **FR-002**: The status bar item MUST be hidden when Focus Space contains zero items.
- **FR-003**: Clicking the status bar item MUST reveal and focus the Focus Space tree view.
- **FR-004**: The status bar count MUST update in real-time as items are added or removed.

**Add All Open Editors**
- **FR-005**: The extension MUST provide a command that adds all open editor tabs (with persisted file URIs) to Focus Space.
- **FR-006**: The command MUST skip files already present in Focus Space (no duplicates).
- **FR-007**: The command MUST skip untitled documents and files matching exclude patterns.
- **FR-008**: The command MUST report how many files were added and how many were skipped.

**Copilot Integration Hardening**
- **FR-009**: The extension MUST consolidate Copilot integration into a single production command, replacing the three test commands.
- **FR-010**: The extension MUST estimate token count before building context and enforce a configurable budget (default 60,000 tokens).
- **FR-011**: When the token budget is exceeded, the extension MUST skip remaining files and warn the user with the count of excluded files.
- **FR-012**: The extension MUST attempt to open the Copilot Chat panel; if that fails, it MUST still place content on the clipboard and inform the user.
- **FR-013**: The extension MUST skip files that no longer exist on disk and note them in the formatted output.
- **FR-014**: The extension MUST show progress feedback during context building for large file sets.

**Create from Git Changes**
- **FR-015**: The extension MUST provide a command that populates Focus Space with files from the current Git working tree diff (modified, added, staged).
- **FR-016**: The command MUST gracefully handle the absence of a Git repository or Git extension with an informational message.
- **FR-017**: The command MUST respect existing Focus Space entries (no duplicates) and exclude patterns.

**Folder Rename Resilience**
- **FR-018**: The extension MUST detect correlated create/delete file system events within a configurable time window (default 300ms) and treat them as a rename.
- **FR-019**: When a rename is detected, the extension MUST update all affected Focus Space entry paths recursively.
- **FR-020**: When the detection window expires without a matching event, the extension MUST fall back to standard create/delete behavior.

### Key Entities

- **StatusBarIndicator**: A disposable VS Code `StatusBarItem` bound to Focus Space item count. Hidden when count is zero.
- **TokenBudget**: An estimation model mapping file byte size to approximate token count (~4 chars per token), used to enforce Copilot context limits.
- **RenameDetectionWindow**: A time-bounded buffer that holds unmatched file system events, correlating create/delete pairs by filename.

## Assumptions

- The Git extension (`vscode.git`) API is available via `vscode.extensions.getExtension('vscode.git')` — this is bundled with VS Code and does not need to be installed separately.
- Token estimation at ~4 characters per token is sufficient for Copilot's context window; exact tokenization is unnecessary.
- The existing `focusSpace.excludePatterns` setting applies uniformly to all commands that add files.
- The 300ms rename detection window is sufficient for file system event correlation on all supported platforms; this will be configurable for edge cases.
- The status bar indicator uses the left-aligned status bar area (lower priority than language/encoding indicators).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see their Focus Space file count at a glance without opening the sidebar, and can navigate to it in one click.
- **SC-002**: Users can populate Focus Space from open editors in under 2 seconds regardless of tab count.
- **SC-003**: Sending Focus Space context to Copilot succeeds on the first attempt for 95% of users (content reaches clipboard and notification is shown).
- **SC-004**: Users working on feature branches can populate Focus Space from their changed files in under 3 seconds.
- **SC-005**: Folder renames preserve 100% of affected Focus Space entries — zero data loss on rename operations.
- **SC-006**: All 5 improvements ship without increasing extension activation time by more than 50ms.
- **SC-007**: The existing 250+ test suite continues to pass; each improvement adds proportional test coverage.
