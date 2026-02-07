# Tasks: Quick Win Polish

**Input**: Design documents from `/specs/001-quick-win-polish/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included per Constitution Principle III (Test Discipline). One test task per user story, referencing test files from plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Configuration and shared infrastructure changes needed before user stories

- [ ] T001 Add new settings `focusSpace.copilotTokenBudget` and `focusSpace.renameDetectionWindowMs` to `package.json` contributes.configuration
- [ ] T002 Register new settings in `src/utils/configurationManager.ts` with getter methods (`getCopilotTokenBudget()`, `getRenameDetectionWindowMs()`)
- [ ] T003 Add `getFileCount()` convenience method to `src/managers/focusSpaceManager.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove deprecated commands that are being replaced. This unblocks US3 (Copilot Hardening) and cleans up the command surface.

**⚠️ CRITICAL**: Must complete before US3 to avoid command ID conflicts.

- [ ] T004 Remove `focusSpace.testCopilotCommands`, `focusSpace.testWorkspaceFile`, `focusSpace.testClipboard` command registrations from `src/extension.ts`
- [ ] T005 Remove the three test commands and their menu entries from `package.json` (contributes.commands, contributes.menus)
- [ ] T006 Add new commands `focusSpace.addAllOpenEditors`, `focusSpace.sendToCopilot`, `focusSpace.addFromGitChanges`, `focusSpace.revealView` to `package.json` (contributes.commands, contributes.menus)

**Checkpoint**: Extension compiles and runs. Old test commands are gone. New commands are registered but not yet implemented (no-op or placeholder).

---

## Phase 3: User Story 1 — Status Bar Indicator (Priority: P1) 🎯 MVP

**Goal**: Show a persistent status bar indicator with file count. Hidden when empty. Click to reveal Focus Space panel.

**Independent Test**: Add 3 files → status bar shows "$(target) 3 files" → click → panel opens. Remove all → status bar disappears.

### Implementation

- [ ] T007 [US1] Create `src/utils/statusBarIndicator.ts` — StatusBarIndicator class with `create()`, `update(count)`, `dispose()` methods using `StatusBarItem` (left-aligned, ID `focusSpace.indicator`, command `focusSpace.revealView`)
- [ ] T008 [US1] Implement `focusSpace.revealView` command handler in `src/extension.ts` — execute `focusSpace.focusSpace.focus`
- [ ] T009 [US1] Wire StatusBarIndicator lifecycle in `src/extension.ts` — instantiate on activation, subscribe to `FocusSpaceManager.onDidChange` to call `update()`, push to `context.subscriptions`
- [ ] T010 [US1] Add tests in `src/test/suite/statusBarIndicator.test.ts` — verify show/hide on count change, click reveals panel, correct count after restore, hidden when empty

**Checkpoint**: Status bar shows file count, hides when empty, click reveals panel. Tests pass. US1 is fully functional.

---

## Phase 4: User Story 2 — Add All Open Editors (Priority: P2)

**Goal**: Single command to add all open editor tabs to Focus Space, skipping duplicates, untitled docs, and excluded files.

**Independent Test**: Open 5 files → run command → all 5 appear. Run again → "All already present."

### Implementation

- [X] T011 [US2] Implement `focusSpace.addAllOpenEditors` command handler in `src/extension.ts` — enumerate `tabGroups.all`, filter `TabInputText` with `uri.scheme === 'file'`, deduplicate, check `hasEntry()` and exclude patterns, call `addEntry()`, show summary message
- [X] T012 [US2] Add tests in `src/test/suite/addOpenEditors.test.ts` — verify adds all tabs, skips duplicates, skips untitled, skips excluded, reports counts, handles zero tabs

**Checkpoint**: Command adds open editors. Duplicates and untitled docs skipped. Informational messages shown. Tests pass. US2 is fully functional.

---

## Phase 5: User Story 3 — Copilot Integration Hardening (Priority: P3)

**Goal**: Replace 3 test commands with a single production `sendToCopilot` command. Token-aware context building with progress, budget enforcement, binary detection, and graceful degradation.

**Independent Test**: Add 10 files → right-click section → "Send to Copilot Chat" → progress shows → clipboard has formatted markdown → Copilot Chat opens (or paste instruction).

### Implementation

- [X] T013 [P] [US3] Create `src/utils/tokenBudget.ts` — TokenBudgetBuilder class: `buildContext(entries, budget)` method that reads files, detects binary (null byte in first 512 bytes), estimates tokens (charCount/4), enforces budget, skips missing/large (>1MB) files, truncates individual files >50K chars, returns `TokenBudgetResult`
- [X] T014 [P] [US3] Rewrite `src/utils/copilotChatIntegration.ts` — single `sendToCopilot(entries, manager)` method: resolves target entries via TreeOperations.flatten, delegates to TokenBudgetBuilder, formats markdown output, copies to clipboard, attempts `workbench.action.chat.open`, shows summary notification
- [X] T015 [US3] Implement `focusSpace.sendToCopilot` command handler in `src/extension.ts` — accept optional tree item argument, resolve scope (single item / section / all), call `sendToCopilot()` with `withProgress(Notification, cancellable)`, wire context menu
- [X] T016 [US3] Add tests in `src/test/suite/copilotIntegration.test.ts` — verify token budget enforcement, binary file skipping, missing file skipping, clipboard population, progress notification, graceful degradation when Copilot unavailable

**Checkpoint**: Single Copilot command works. Token budget enforced. Binary/missing files skipped. Progress shown. Clipboard always populated. Tests pass. US3 is fully functional.

---

## Phase 6: User Story 4 — Create from Git Changes (Priority: P4)

**Goal**: Populate Focus Space from the current Git working tree diff (modified + staged + merge changes).

**Independent Test**: Modify 3 files, stage 1 new file → run command → 4 files appear. No Git repo → informational message.

### Implementation

- [X] T017 [US4] Create `src/utils/gitChangesImporter.ts` — `getGitChanges()` function: get Git extension, activate if needed, get repository, collect URIs from `workingTreeChanges` + `indexChanges` + `mergeChanges`, deduplicate, filter deleted status, return `GitChangesResult`
- [X] T018 [US4] Implement `focusSpace.addFromGitChanges` command handler in `src/extension.ts` — call `getGitChanges()`, filter existing entries and exclude patterns, call `addEntry()` for each, show summary message with added/skipped/excluded counts
- [X] T019 [US4] Add tests in `src/test/suite/gitChangesImporter.test.ts` — verify URI collection from working tree + index + merge changes, dedup, exclude patterns, no-git graceful handling, no-changes message

**Checkpoint**: Git changes command works. Missing Git extension handled gracefully. Duplicates and excludes filtered. Tests pass. US4 is fully functional.

---

## Phase 7: User Story 5 — Folder Rename Resilience (Priority: P5)

**Goal**: Detect correlated create/delete file system events within a configurable time window and treat them as renames, updating Focus Space entry paths.

**Independent Test**: Add 3 files from `src/utils/` → rename folder to `src/helpers/` → entries update to new paths. Genuine delete (no matching create) still removes entries.

### Implementation

- [X] T020 [US5] Add rename detection logic to `src/utils/fileSystemWatcher.ts` — RenameDetectionWindow: on `onDidDelete`, buffer a `RenameCandidate` with basename + affected entry IDs, start timer (`renameDetectionWindowMs`). On `onDidCreate` within window, match by basename → update entry paths. On timeout → fall back to standard delete behavior.
- [X] T021 [US5] Add tests in `src/test/suite/folderRenameResilience.test.ts` — verify create/delete correlation within window, path update for nested entries, timeout fallback to genuine delete, genuine create ignored, configurable window duration

**Checkpoint**: VS Code renames still handled by existing `onDidRenameFiles`. External renames (terminal `mv`) now detected within window. Genuine deletes still work. Tests pass. US5 is fully functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation across all stories

- [X] T022 [P] Remove dead code from old Copilot test methods (any remaining references in test files)
- [X] T023 [P] Update `CHANGELOG.md` with all 5 improvements
- [X] T024 Run `npm run validate` (compile + lint + test) — all existing + new tests pass
- [X] T025 Run quickstart.md manual test scenarios for each user story

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS US3 (command ID cleanup)
- **User Stories (Phases 3–7)**: All depend on Phase 2 (command declarations in T006), except US5 which only needs Phase 1
  - US1, US2, US3, US4 require Phase 2 for their command IDs to be declared in `package.json`
  - US5 can start after Phase 1 (modifies existing watcher, no new commands)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — needs `focusSpace.revealView` declared in T006
- **US2 (P2)**: After Phase 2 — needs `focusSpace.addAllOpenEditors` declared in T006
- **US3 (P3)**: After Phase 2 — needs old commands removed (T004/T005) and new declared (T006)
- **US4 (P4)**: After Phase 2 — needs `focusSpace.addFromGitChanges` declared in T006
- **US5 (P5)**: After Phase 1 — no dependencies on other stories

### Within Each User Story

- Utility modules before command handlers
- Command handlers wire everything together
- Story complete before checkpoint validation

### Parallel Opportunities

- T001 + T002 + T003 (Phase 1 — different files)
- T004 + T005 share `package.json` / `extension.ts` — sequential
- T007 (new file) can parallel with T008 + T009 (extension.ts), but T008/T009 are sequential
- T013 + T014 (US3 — different new files)
- T017 (US4 — new file) can parallel with T020 (US5 — different file)
- T022 + T023 (Polish — different files)

---

## Parallel Example: After Phase 2 Completes

```text
# All user stories can proceed in parallel (after Phase 2):

Stream A (US1): T007 → T008 → T009 → T010
Stream B (US2): T011 → T012
Stream C (US3): T013 + T014 (parallel) → T015 → T016
Stream D (US4): T017 → T018 → T019
Stream E (US5): T020 → T021  (can start after Phase 1)

# Within US3, utility modules are parallel:
T013 (tokenBudget.ts) ‖ T014 (copilotChatIntegration.ts) → T015 (extension.ts wiring) → T016 (tests)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T006)
3. Complete Phase 3: US1 Status Bar (T007–T009)
4. **STOP and VALIDATE**: Status bar shows count, hides when empty, click reveals panel
5. Extension is shippable with just this improvement

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Status Bar) → Validate → Shippable ✅
3. US2 (Open Editors) → Validate → Shippable ✅
4. US3 (Copilot Hardening) → Validate → Shippable ✅
5. US4 (Git Changes) → Validate → Shippable ✅
6. US5 (Rename Resilience) → Validate → Shippable ✅
7. Polish → Final validation → Release

### Sequential Solo Strategy

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025

---

## Notes

- Zero new runtime dependencies — all features use VS Code built-in APIs
- All user stories are independently testable after their phase checkpoint
- Each story includes a test task per Constitution Principle III
- Commit after each task or logical group (per story phase)
- `extension.ts` is modified by multiple stories — execute story phases sequentially to avoid merge conflicts
- Token budget constants defined in `tokenBudget.ts`, not duplicated elsewhere
- Total: 25 tasks (T001–T025)
