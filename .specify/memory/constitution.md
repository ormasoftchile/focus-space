<!--
Sync Impact Report
  Version: 1.0.0 (unchanged — validation pass, no content modifications)
  Previous version: 1.0.0 (initial ratification 2026-02-07)
  Modified principles: none
  Added sections: none
  Removed sections: none
  Templates validated:
    - .specify/templates/plan-template.md ✅ aligned (Constitution Check is dynamic)
    - .specify/templates/spec-template.md ✅ aligned (principle-agnostic structure)
    - .specify/templates/tasks-template.md ✅ aligned (phase-based, not principle-driven)
    - .specify/templates/checklist-template.md ✅ aligned (generic template)
    - .specify/templates/agent-file-template.md ✅ aligned (generic template)
  Runtime guidance validated:
    - .github/copilot-instructions.md ✅ consistent (increment workflow, test discipline)
    - docs/ARCHITECTURE.md ✅ consistent (design principles map to I, II, IV, V)
    - CONTRIBUTING.md ✅ consistent (build/test commands, quality standards)
  Follow-up TODOs: none
-->

# Focus Space Constitution

## Core Principles

### I. VS Code Extension-First

Every feature MUST be a well-scoped contribution to the VS Code extension model. This means:
- Functionality is exposed through commands, tree views, context menus, or settings — never standalone scripts or side processes.
- All UI MUST use VS Code's native API surface (`TreeDataProvider`, `StatusBarItem`, `commands`, `when` clauses). No custom webviews unless the native API is demonstrably insufficient and the justification is documented.
- The extension MUST remain a single activation unit — no sub-extensions, no sidecar processes.

**Rationale:** VS Code users expect extensions to behave as native citizens. Deviating from the extension model creates maintenance burden and UX friction.

### II. Incremental Development

Features MUST be developed as independent, well-scoped increments:
- Each increment has a single responsibility (data model OR UI OR commands — not mixed).
- Each increment MUST be testable in isolation with its own test suite.
- Increments MUST be built in dependency order (foundation → features → polish).
- No increment may ship with known regressions from a previous increment. Bugs MUST be fixed immediately with a regression test before proceeding.

**Rationale:** The project's 15+ completed increments prove this model works. Deviating introduces coupling and makes failures hard to attribute.

### III. Test Discipline (NON-NEGOTIABLE)

Every behavioral change MUST have corresponding automated tests:
- Use `@vscode/test-electron` + Mocha (the project's established stack). No alternative test runners.
- Tests run in a real VS Code instance for full API access.
- Bug fixes MUST include a regression test that fails without the fix and passes with it.
- Edge cases (empty state, max capacity, invalid input, missing dependencies) MUST be covered.
- Target: maintain 250+ test baseline; new features MUST add proportional coverage.

**Rationale:** The existing 250+ test suite is a critical asset. Untested code is unshippable code.

### IV. Data Integrity & Persistence

Focus Space state MUST survive all lifecycle transitions without data loss:
- Workspace state is persisted via VS Code Memento API with debounced saves.
- File system events (rename, move, delete) MUST update Focus Space entries in real-time.
- Folder renames (which emit create/delete pairs, not rename events) MUST be handled with a detection window — not treated as independent operations.
- All tree mutations MUST invalidate the ID and URI caches in `TreeOperations`.
- Batch operations MUST use `startBatch()`/`endBatch()` to defer cache invalidation.

**Rationale:** Users curate Focus Space intentionally. Losing that curation due to a file rename or VS Code restart destroys trust.

### V. Performance by Default

The extension MUST remain responsive in workspaces with 10k+ files:
- File system watcher events MUST be debounced (configurable, default 100ms).
- Persistence saves MUST be debounced (configurable, default 500ms).
- Folder contents MUST be lazy-loaded — never eagerly traversed on activation.
- The `excludePatterns` setting MUST be respected by all file operations to prevent watch exhaustion on `node_modules/`, `dist/`, etc.
- Maximum item count (`maxItemCount`, default 1000) MUST trigger a warning — not a silent failure.

**Rationale:** VS Code extensions share the host process. A slow extension degrades the entire editor.

### VI. Transparent AI Integration

Copilot integration MUST be honest about its capabilities and limitations:
- Context export uses clipboard-based text injection — this is the only viable approach (Copilot ignores third-party `ChatVariableResolver`s).
- Token limits (~32k) MUST be estimated and enforced. Files that exceed the budget MUST be skipped with a user-visible warning.
- The extension MUST NOT claim to "send files to Copilot" — it copies formatted text that the user pastes. The UX and documentation MUST reflect this accurately.
- Graceful degradation: if the Copilot Chat panel command fails, the clipboard content MUST still be available.

**Rationale:** Overpromising AI integration erodes user trust. The clipboard approach works well when communicated clearly.

## Technology & Constraints

- **Language:** TypeScript (strict mode via `tsconfig.json`).
- **Runtime:** VS Code Extension Host, engine `^1.74.0`.
- **Testing:** `@vscode/test-electron` + Mocha + Sinon.
- **Linting:** ESLint with `@typescript-eslint`.
- **Packaging:** `vsce package` → `.vsix`.
- **Platform:** Windows, macOS, Linux — all MUST be supported. No platform-specific code without a cross-platform fallback.
- **Dependencies:** Zero runtime dependencies beyond VS Code's built-in APIs. Dev dependencies only for build/test tooling.

## Development Workflow

### Increment Lifecycle
1. **Spec** → define user stories with acceptance scenarios.
2. **Plan** → constitution check, technical context, project structure.
3. **Tasks** → ordered task list per user story with parallel markers.
4. **Implement** → tests first, then code, per increment.
5. **Validate** → `npm run validate` (compile + lint + test) MUST pass.
6. **Document** → update `focus-space-design.md` with completion status.

### Quality Gates
- `npm run compile` — zero TypeScript errors.
- `npm run lint` — zero ESLint violations.
- `npm test` — all tests pass, no skipped tests without a tracked issue.
- `npm run validate` — compound gate that MUST pass before any merge.

### Release Process
- Semantic versioning via `npm run release:{patch|minor|major}`.
- CI/CD via GitHub Actions (see `docs/CI-CD-SETUP.md`).
- CHANGELOG.md MUST be updated for every release.

## Governance

This constitution is the authoritative source for project-level decisions. All implementation plans, specs, and code reviews MUST verify compliance with these principles.

### Amendment Procedure
1. Propose the change with rationale (issue or PR description).
2. Update this file with the new or modified principle.
3. Increment the version: MAJOR for principle removal/redefinition, MINOR for additions, PATCH for clarifications.
4. Update `LAST_AMENDED_DATE`.
5. Run the Sync Impact Report checklist to propagate changes to dependent templates.

### Compliance
- Every plan's "Constitution Check" section MUST reference the active principles.
- Complexity violations (e.g., adding a webview, a new dependency) MUST be documented in the plan's "Complexity Tracking" table with justification.
- The `copilot-instructions.md` and this constitution MUST remain consistent — if a principle changes here, update guidance there.

**Version**: 1.0.0 | **Ratified**: 2026-02-07 | **Last Amended**: 2026-02-07
