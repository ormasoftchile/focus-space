# Changelog

All notable changes to the Focus Space extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Copilot Chat integration with multiple testing methods (EXPERIMENTAL - not ready for release)
- Direct commands integration for sending Focus Space files to Copilot (EXPERIMENTAL)
- Workspace file approach for creating markdown context files (EXPERIMENTAL)
- Enhanced clipboard integration with automatic Copilot Chat opening (EXPERIMENTAL)

### Changed
- Improved test command feedback with detailed file processing information (EXPERIMENTAL)
- Enhanced error messages and user feedback across all integration methods (EXPERIMENTAL)

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