# Quickstart: Quick Win Polish

**Feature**: 001-quick-win-polish
**Branch**: `001-quick-win-polish`

## Prerequisites

- Node.js v16+
- VS Code (latest stable)
- Repository cloned and on the `001-quick-win-polish` branch

## Setup

```bash
git checkout 001-quick-win-polish
npm install
npm run compile
```

## Development Workflow

### Run the extension

Press `F5` in VS Code to launch the Extension Development Host.

### Run tests

```bash
npm test
```

### Validate (compile + lint + test)

```bash
npm run validate
```

### Watch mode

```bash
npm run watch
```

## Implementation Order

Each user story is independently implementable. Recommended order (matches priority):

| Order | Story | Key Files | Dependencies |
|-------|-------|-----------|--------------|
| 1 | Status Bar Indicator | `src/utils/statusBarIndicator.ts`, `src/extension.ts` | None |
| 2 | Add All Open Editors | `src/extension.ts` (new command) | None |
| 3 | Copilot Hardening | `src/utils/copilotChatIntegration.ts`, `src/utils/tokenBudget.ts`, `src/extension.ts` | None |
| 4 | Git Changes Import | `src/utils/gitChangesImporter.ts`, `src/extension.ts` | None |
| 5 | Folder Rename Resilience | `src/utils/fileSystemWatcher.ts` | None |

All stories depend on the existing `FocusSpaceManager`, `TreeOperations`, and `ConfigurationManager` — no new shared infrastructure needed.

## Testing Each Story

### US1: Status Bar Indicator
1. `F5` → Extension Development Host
2. Add files to Focus Space → verify status bar shows count
3. Remove all files → verify status bar disappears
4. Click status bar → verify Focus Space panel opens

### US2: Add All Open Editors
1. Open 5+ files in editor tabs
2. Run "Focus Space: Add All Open Editors" from Command Palette
3. Verify all files appear in Focus Space
4. Run again → verify no duplicates added

### US3: Copilot Integration
1. Add 5+ files to Focus Space
2. Right-click a section → "Send to Copilot Chat"
3. Verify progress notification appears
4. Verify clipboard contains formatted markdown
5. Paste into Copilot Chat → verify content is usable

### US4: Git Changes Import
1. Make changes to files on a feature branch
2. Run "Focus Space: Add from Git Changes"
3. Verify changed files appear in Focus Space

### US5: Folder Rename Resilience
1. Add files from `src/utils/` to Focus Space
2. Rename `src/utils/` to `src/helpers/` in Explorer
3. Verify Focus Space entries update to new paths
4. Test external rename via terminal `mv`

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/extension.ts` | Command registration, lifecycle |
| `src/managers/focusSpaceManager.ts` | State management, CRUD, persistence |
| `src/utils/treeOperations.ts` | Tree traversal, cache, batch ops |
| `src/utils/configurationManager.ts` | Settings access |
| `src/utils/fileSystemWatcher.ts` | File system event handling |
| `src/utils/copilotChatIntegration.ts` | Copilot context building |
| `src/models/focusEntry.ts` | Data model interfaces |

## Quality Gates

Before merging, all must pass:

```bash
npm run compile   # Zero TypeScript errors
npm run lint      # Zero ESLint violations
npm test          # All tests pass (250+ baseline + new)
npm run validate  # Compound gate
```
