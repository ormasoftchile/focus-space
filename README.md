# Focus Space for VS Code

**A VS Code extension that adds a dedicated "Focus Space" panel to enhance your development workflow by curating the files and folders you're actively working on.**

![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visual-studio-code)
![License](https://img.shields.io/github/license/ormasoftchile/focus-space)
![Version](https://img.shields.io/badge/version-0.0.1-green)

## 🎯 Goals & Purpose

Focus Space solves the common problem of **context switching overhead** in large codebases. Instead of constantly scrolling through the Explorer or losing track of important files, Focus Space provides:

- **Curated File Management**: Keep only the files you're actively working on in a dedicated panel
- **Enhanced GitHub Copilot Integration**: Send focused context directly to Copilot Chat for better AI assistance
- **Reduced Cognitive Load**: Eliminate distractions and maintain focus on your current task
- **Improved Collaboration**: Share your focus context with team members

## ✨ What Focus Space Does

### 📁 **Smart File Curation**
- Add files and folders to your Focus Space via context menus, drag & drop, or commands
- **Auto-hide when empty** - the panel only appears when you have focused items
- **Active file reveal** - automatically highlights your current file in Focus Space instead of Explorer

### 🗂️ **Intelligent Organization**
- **Virtual Sections**: Create logical groupings like "Current Feature", "Bug Fixes", or "Dependencies"
- **Drag & Drop Reordering**: Organize your focus items exactly how you need them
- **Folder Auto-Conversion**: Folders automatically become sections when you add children

### 🤖 **GitHub Copilot Integration**
- **Send to Copilot Chat**: Right-click any file or section to send content directly to Copilot
- **Batch Operations**: Send entire sections with multiple files for comprehensive context
- **Smart Content Formatting**: Automatically formats code with syntax highlighting and file information

### ⚙️ **Comprehensive Configuration**
- **20+ Settings** across Appearance, Behavior, Performance, and Workflow categories
- **Exclude Patterns**: Filter out unwanted files with glob pattern support
- **Customizable Behavior**: Configure reveal behavior, drag & drop preferences, and more
- **Migration System**: Seamless updates with backward compatibility

### 🔄 **File System Integration**
- **Auto-sync**: Automatically updates when files are moved, renamed, or deleted
- **Cross-workspace**: Maintain separate focus contexts for different projects
- **Persistent State**: Your focus items are saved and restored between sessions

## 🚀 Features Overview

| Feature | Description |
|---------|-------------|
| **Focus Curation** | Add files/folders via context menu, editor title, or drag & drop |
| **Smart Reveal** | Active files reveal in Focus Space instead of cluttered Explorer |
| **Virtual Sections** | Create logical groupings for better organization |
| **Copilot Integration** | Send focused context directly to GitHub Copilot Chat |
| **Auto-hide Panel** | Panel appears/disappears based on content, reducing UI clutter |
| **File Watching** | Automatically tracks file moves, renames, and deletions |
| **Exclude Patterns** | Filter unwanted files with powerful glob pattern support |
| **Drag & Drop** | Intuitive reordering and organization of focus items |
| **Configuration System** | 20+ settings for complete customization |
| **Cross-platform** | Works on Windows, macOS, and Linux |

## 📦 Installation

### From VS Code Marketplace *(Coming Soon)*
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Focus Space"
4. Click Install

### Manual Installation
1. Download the latest `.vsix` file from [Releases](https://github.com/ormasoftchile/focus-space/releases)
2. In VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX"
3. Select the downloaded file

## 🛠️ How to Use

### Basic Workflow
1. **Add Items**: Right-click files/folders in Explorer → "Add to Focus Space"
2. **Organize**: Drag & drop to reorder, create sections for logical grouping
3. **Work Focused**: Use the Focus Space panel as your primary navigation
4. **Copilot Integration**: Right-click items → "Send to Copilot Chat" for AI assistance

### Advanced Features
- **Sections**: Right-click in Focus Space → "Create Section" for logical grouping
- **Batch Operations**: Select multiple items and send entire contexts to Copilot
- **Keyboard Shortcuts**: Use commands from Command Palette (Ctrl+Shift+P)
- **Configuration**: File → Preferences → Settings → "Focus Space" for customization

## ⚙️ Configuration

Focus Space offers extensive customization through VS Code settings:

### Appearance
- `focusSpace.hideWhenEmpty` - Auto-hide panel when empty *(default: true)*
- `focusSpace.showItemCount` - Display item count in panel *(default: true)*
- `focusSpace.showFileIcons` - Show file type icons *(default: true)*
- `focusSpace.sortOrder` - Item sorting: manual, name, type, date *(default: manual)*

### Behavior
- `focusSpace.revealBehavior` - How active files are revealed *(default: smart)*
- `focusSpace.allowDragAndDrop` - Enable drag & drop reordering *(default: true)*
- `focusSpace.excludePatterns` - Glob patterns for filtering files
- `focusSpace.autoRemoveDeleted` - Remove deleted files automatically *(default: true)*

### Performance
- `focusSpace.enableFileWatcher` - Monitor file system changes *(default: true)*
- `focusSpace.maxFileSize` - Maximum file size for Copilot integration *(default: 10MB)*
- `focusSpace.watcherDebounceMs` - File system event debouncing *(default: 100ms)*

*See all 20+ settings in VS Code Settings → "Focus Space"*

## 🏗️ Development Status

Focus Space is built using a systematic incremental development approach:

- ✅ **Increments 1-15 Completed**: Core functionality, configuration system, Copilot integration
- 🚧 **Increment 16**: Polish & Performance optimization *(current)*
- 📋 **Future**: Enhanced UI, keyboard shortcuts, advanced features

### Current Capabilities
- Full Focus Space functionality with file/folder management
- Complete GitHub Copilot Chat integration
- Comprehensive configuration system (20+ settings)
- File system watching and auto-sync
- Cross-platform compatibility
- Production-ready codebase with 250+ tests

## 🧪 Testing

The extension includes comprehensive testing:

```bash
# Run all tests
npm test

# Compile TypeScript
npm run compile

# Package extension
vsce package
```

- **250+ Unit Tests** covering all functionality
- **Edge Case Testing** for robust error handling
- **Performance Testing** for large codebases
- **Integration Testing** with VS Code APIs

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Clone the repository: `git clone https://github.com/ormasoftchile/focus-space.git`
2. Install dependencies: `npm install`
3. Open in VS Code: `code .`
4. Press F5 to launch Extension Development Host

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ using TypeScript and the VS Code Extension API
- Developed in collaboration with GitHub Copilot
- Inspired by the need for better focus and context management in modern development

---

**Focus Space** - *Because context is everything in software development* 🎯
