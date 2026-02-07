# Implementation Plan: Quick Win Polish

**Branch**: `001-quick-win-polish` | **Date**: 2026-02-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-quick-win-polish/spec.md`

## Summary

Five high-impact improvements to bring the Focus Space extension to production-ready v1: a status bar indicator for ambient awareness, "Add All Open Editors" for instant onboarding, Copilot integration hardening with token-aware context building, "Add from Git Changes" for branch-based workflows, and folder rename resilience via improved file system event handling.

## Technical Context

**Language/Version**: TypeScript (strict mode, `tsconfig.json`)
**Primary Dependencies**: VS Code Extension API (engine `^1.74.0`), zero runtime dependencies
**Storage**: VS Code Memento API via `FocusSpaceManager` with debounced persistence to `.vscode/focus-space.json`
**Testing**: `@vscode/test-electron` + Mocha + Sinon (250+ existing tests)
**Target Platform**: VS Code on Windows, macOS, Linux
**Project Type**: Single VS Code extension
**Performance Goals**: <50ms added activation time, debounced events (100ms watcher, 500ms persistence)
**Constraints**: Zero runtime dependencies, single activation unit, no webviews, no sidecar processes
**Scale/Scope**: Workspaces with 10k+ files, Focus Space with up to 1000 items

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | VS Code Extension-First | ✅ PASS | All features use `StatusBarItem`, `commands`, `TreeView`, `TabGroups` — native API only |
| II | Incremental Development | ✅ PASS | 5 user stories are independently testable; each is a single-responsibility increment |
| III | Test Discipline | ✅ PASS | Each story adds proportional tests per SC-007; existing 250+ baseline maintained |
| IV | Data Integrity & Persistence | ✅ PASS | US5 (folder rename resilience) directly strengthens this principle; US2/US4 use `hasEntry()` dedup |
| V | Performance by Default | ✅ PASS | Token estimation avoids reading all files upfront; status bar update is O(1) count check; exclude patterns respected |
| VI | Transparent AI Integration | ✅ PASS | US3 consolidates 3 test commands into 1 production command with honest UX: clipboard + paste, not "send to Copilot" |

**Gate result: PASS — all 6 principles satisfied. No violations to track.**

## Project Structure

### Documentation (this feature)

```text
specs/001-quick-win-polish/
├── plan.md              # This file
├── research.md          # Phase 0: API research findings
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Development quickstart
├── contracts/           # Phase 1: Command + setting contracts
│   └── commands.md      # New and modified commands
├── checklists/          # Quality checklists
│   └── requirements.md  # Specification quality check
└── tasks.md             # Phase 2: Task list (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── extension.ts                          # Modified: register new commands, status bar, remove test commands
├── models/
│   └── focusEntry.ts                     # No changes needed
├── managers/
│   └── focusSpaceManager.ts              # Modified: add getFileCount() convenience method
├── providers/
│   └── focusSpaceTreeDataProvider.ts     # No changes needed
├── controllers/
│   └── focusSpaceDragAndDropController.ts # No changes needed
├── utils/
│   ├── statusBarIndicator.ts             # NEW: StatusBarItem manager (US1)
│   ├── copilotChatIntegration.ts         # REWRITE: consolidate 3 test methods → 1 production method (US3)
│   ├── tokenBudget.ts                    # NEW: Token estimation + binary detection (US3)
│   ├── gitChangesImporter.ts             # NEW: Git extension API integration (US4)
│   ├── fileSystemWatcher.ts              # Modified: add rename detection window for external renames (US5)
│   ├── configurationManager.ts           # Modified: add tokenBudget + renameDetectionWindowMs settings
│   ├── activeEditorTracker.ts            # No changes needed
│   ├── configurationMigrator.ts          # No changes needed
│   ├── focusSpaceRevealHandler.ts        # No changes needed
│   └── treeOperations.ts                 # No changes needed
└── test/
    └── suite/
        ├── statusBarIndicator.test.ts    # NEW: US1 tests
        ├── addOpenEditors.test.ts        # NEW: US2 tests
        ├── copilotIntegration.test.ts    # NEW: US3 tests (replaces testRunner.test.ts patterns)
        ├── gitChangesImporter.test.ts    # NEW: US4 tests
        └── folderRenameResilience.test.ts # NEW: US5 tests
```

**Structure Decision**: Single VS Code extension project. All new code lives under `src/utils/` as utility modules following the existing pattern. New test files in `src/test/suite/` following the existing naming convention. No new directories or structural changes.

## Complexity Tracking

> No violations. All features use VS Code native APIs. Zero new runtime dependencies.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
