# Contributing to Focus Space

Thank you for your interest in contributing to Focus Space! We welcome contributions from the community and are excited to see what you'll bring to this project.

## 🎯 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **VS Code** (latest version recommended)
- **Git** for version control

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/focus-space.git
   cd focus-space
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Open in VS Code**:
   ```bash
   code .
   ```

5. **Start development**:
   - Press `F5` to launch the Extension Development Host
   - Make your changes and test them in the development environment

## 🛠️ Development Workflow

### Code Structure

- `src/` - Main source code
  - `extension.ts` - Extension entry point
  - `managers/` - Core business logic
  - `providers/` - VS Code tree data providers
  - `controllers/` - UI interaction handlers
  - `utils/` - Shared utilities and helpers
  - `models/` - Data models and interfaces
  - `test/` - Comprehensive test suite

### Building and Testing

```bash
# Compile TypeScript
npm run compile

# Run all tests
npm test

# Watch mode for development
npm run watch

# Package extension
vsce package
```

### Code Quality

We maintain high code quality standards:

- **TypeScript**: Strongly typed code throughout
- **ESLint**: Code linting with our configuration
- **Testing**: 250+ tests with comprehensive coverage
- **Documentation**: Clear comments and documentation

## 📝 How to Contribute

### 1. Issues and Bug Reports

- **Search existing issues** before creating new ones
- **Use issue templates** when available
- **Provide detailed information**:
  - VS Code version
  - Extension version
  - Operating system
  - Steps to reproduce
  - Expected vs actual behavior

### 2. Feature Requests

- **Check the roadmap** in `docs/focus-space-design.md`
- **Discuss large features** in issues before implementing
- **Follow the incremental development approach**

### 3. Pull Requests

#### Before You Start
- **Create an issue** to discuss your changes
- **Check existing PRs** to avoid duplication
- **Review the codebase** to understand patterns

#### PR Guidelines
- **Fork and branch**: Create a feature branch from `main`
- **Descriptive names**: Use clear branch names like `feature/keyboard-shortcuts`
- **Small, focused changes**: One feature or fix per PR
- **Tests included**: Add tests for new functionality
- **Documentation**: Update docs if needed

#### PR Process
1. **Create your branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow existing code patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Test thoroughly**:
   ```bash
   npm run compile
   npm test
   ```

4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add keyboard shortcuts for focus management"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

## 🧪 Testing Guidelines

### Running Tests
```bash
# All tests
npm test

# Specific test file
npm test -- --grep "ConfigurationManager"

# Watch mode
npm run test:watch
```

### Writing Tests
- **Unit tests** for all new functionality
- **Integration tests** for complex interactions
- **Edge case testing** for robust error handling
- **Performance tests** for optimization features

### Test Structure
```typescript
suite('Feature Name', () => {
    setup(() => {
        // Test setup
    });
    
    teardown(() => {
        // Cleanup
    });
    
    test('Should do something specific', () => {
        // Test implementation
    });
});
```

## 📊 Development Process

### Incremental Development

Focus Space follows an incremental development approach:

1. **Review current increment** in `docs/focus-space-design.md`
2. **Plan your changes** to fit the architecture
3. **Implement in small, testable chunks**
4. **Complete testing before moving on**

### Code Style

- **TypeScript**: Use strict type checking
- **Naming**: Clear, descriptive names for variables and functions
- **Comments**: Document complex logic and public APIs
- **Formatting**: Let ESLint handle formatting

### Architecture Principles

- **Single Responsibility**: Each class/module has one clear purpose
- **Type Safety**: Leverage TypeScript's type system
- **Error Handling**: Graceful error handling with user feedback
- **Performance**: Consider performance implications of changes

## 🔄 Release Process

We follow semantic versioning (SemVer):

- **MAJOR** version: Breaking changes
- **MINOR** version: New features (backward compatible)
- **PATCH** version: Bug fixes

## 🤝 Community Guidelines

### Communication

- **Be respectful** and inclusive in all interactions
- **Ask questions** if you're unsure about anything
- **Share knowledge** and help other contributors
- **Follow the Code of Conduct**

### Getting Help

- **Issues**: For bugs and feature requests
- **Discussions**: For general questions and ideas
- **Code Review**: Learn from PR feedback

### Recognition

All contributors are recognized in:
- Git commit history
- Release notes for significant contributions
- Special mentions for major features

## 📚 Resources

- **VS Code Extension API**: [https://code.visualstudio.com/api](https://code.visualstudio.com/api)
- **TypeScript Handbook**: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)
- **Project Architecture**: See `docs/ARCHITECTURE.md`
- **Design Documentation**: See `docs/focus-space-design.md`

## 🙏 Thank You

Your contributions make Focus Space better for everyone. Whether it's code, documentation, bug reports, or feature ideas, every contribution is valuable and appreciated!

---

*Focus Space - Making VS Code development more focused, one file at a time* 🎯