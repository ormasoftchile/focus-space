# Changelog

All notable changes to the Focus Space extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Status Bar Indicator**: Persistent status bar item showing file count (`$(target) N files`). Hides when Focus Space is empty. Click to reveal the Focus Space panel.
- **Add All Open Editors**: New command `Focus Space: Add All Open Editors` — adds all open editor tabs in one action, skipping duplicates, untitled docs, and excluded files.
- **Send to Copilot Chat**: Production-ready `Focus Space: Send to Copilot Chat` command with token-aware context building, binary file detection, progress notification, and clipboard fallback.
- **Add from Git Changes**: New command `Focus Space: Add from Git Changes` — populates Focus Space from modified, staged, and merge-conflict files in the current Git repository.
- **Folder Rename Resilience**: External folder renames (e.g., via terminal `mv`) are now detected within a configurable time window and Focus Space entry paths are updated automatically.
- New settings: `focusSpace.copilotTokenBudget` (default 60000) and `focusSpace.renameDetectionWindowMs` (default 300ms).

### Changed
- Replaced 3 experimental Copilot test commands (`testCopilotCommands`, `testWorkspaceFile`, `testClipboard`) with a single production `sendToCopilot` command.
- Copilot context export now enforces a configurable token budget with per-file size limits and binary detection.

### Removed
- `focusSpace.testCopilotCommands` command (replaced by `focusSpace.sendToCopilot`)
- `focusSpace.testWorkspaceFile` command (replaced by `focusSpace.sendToCopilot`)
- `focusSpace.testClipboard` command (replaced by `focusSpace.sendToCopilot`)

## [0.0.9] - 2024-09-23

### Added
- Comprehensive CHANGELOG.md with version history tracking

### Changed
- Changed keyboard shortcut from Ctrl+Shift+F to Ctrl+Alt+F (Cmd+Alt+F on Mac)
- Updated package.json with bugs URL and homepage links for better discoverability

## [0.0.8] - 2024-09-23

### Added
- Complete CI/CD pipeline with GitHub Actions
- Cross-platform testing on Ubuntu, Windows, and macOS
- Automated marketplace deployment with version tagging
- Comprehensive test suite with 271 passing tests

### Fixed
- Node.js compatibility issues in CI/CD workflows
- PowerShell syntax errors in cross-platform testing
- Authentication issues with VS Code Marketplace deployment

## [0.0.7] - Previous Release

### Added
- Advanced drag and drop functionality
- External file drop support with text/uri-list handling
- Section management with hierarchical file organization
- Active file tracking and auto-reveal functionality

### Fixed
- Tree data provider refresh issues
- File watcher stability improvements
- Configuration migration and validation

## [0.0.6] - Previous Release

### Added
- File system watcher for automatic updates
- Configuration migration system
- Performance optimizations for large workspaces
- Exclude patterns for filtering files

### Fixed
- Memory leaks in file watching
- Configuration validation edge cases

## [0.0.5] - Previous Release

### Added
- Section support for organizing files
- Drag and drop reordering
- Custom labels for entries
- Folder display and management

### Fixed
- Tree operations consistency
- Entry persistence improvements

## [0.0.4] - Previous Release

### Added
- Close non-focus buffers command
- Editor integration improvements
- Context menu enhancements
- Keyboard shortcuts

### Fixed
- Active editor tracking
- Tree highlighting issues

## [0.0.3] - Previous Release

### Added
- Basic Focus Space functionality
- File and folder management
- Tree view provider
- Configuration settings

### Fixed
- Initial stability issues
- Basic operation bugs

## [0.0.2] - Previous Release

### Added
- Core extension infrastructure
- Basic tree operations
- Entry management system

## [0.0.1] - Initial Release

### Added
- Initial Focus Space extension
- Basic file focusing capabilities
- Simple tree view

---

## Version Guidelines

### Added
- New features and functionality

### Changed
- Changes in existing functionality

### Deprecated
- Features that will be removed in upcoming releases

### Removed
- Features removed in this release

### Fixed
- Bug fixes

### Security
- Vulnerability fixes and security improvements