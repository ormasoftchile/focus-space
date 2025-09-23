# CI/CD Setup for Focus Space Extension

This document explains how to set up automated CI/CD for the Focus Space VS Code extension using GitHub Actions.

## Overview

The CI/CD pipeline provides:
- **Automated Testing**: Runs on every push and pull request
- **Multi-platform Testing**: Tests on Ubuntu, Windows, and macOS
- **Automated Publishing**: Publishes to VS Code Marketplace on releases
- **GitHub Releases**: Creates releases with VSIX artifacts
- **Version Management**: Handles semantic versioning automatically

## Setup Instructions

### 1. Get VS Code Marketplace Token

1. Go to [Azure DevOps](https://dev.azure.com)
2. Sign in with your Microsoft account
3. Create a Personal Access Token (PAT):
   - Click your profile picture → Security
   - Select "Personal access tokens"
   - Click "New Token"
   - Name: `VS Code Marketplace Publishing`
   - Organization: `All accessible organizations`
   - Scopes: `Custom defined`
   - Check: `Marketplace > Manage`
   - Set expiration as needed
   - Click "Create"
   - **Copy the token immediately** (you won't see it again)

### 2. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add the following secret:
   - **Name**: `VSCE_PAT`
   - **Value**: Your VS Code Marketplace token from step 1

### 3. Publisher Setup

Ensure your `package.json` has the correct publisher:
```json
{
  "publisher": "your-marketplace-publisher-id"
}
```

## Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`

**Actions:**
- Runs tests on Ubuntu, Windows, and macOS
- Tests with Node.js 18 and 20
- Compiles TypeScript
- Runs linting
- Creates test package
- Uploads test artifacts

### Release Workflow (`.github/workflows/release.yml`)

**Triggers:**
- Git tags starting with `v` (e.g., `v1.0.0`)
- Manual workflow dispatch

**Actions:**
- Runs full test suite
- Updates package.json version
- Compiles and packages extension
- Publishes to VS Code Marketplace
- Creates GitHub release with VSIX file
- Uploads artifacts

## Release Process

### Option 1: Tag-based Release (Recommended)

1. **Prepare Release:**
   ```bash
   # Update version in package.json if needed
   npm version patch  # or minor/major
   
   # Commit any final changes
   git add .
   git commit -m "Prepare release v1.0.0"
   ```

2. **Create Release Tag:**
   ```bash
   # Create and push tag
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Automatic Process:**
   - GitHub Actions detects the tag
   - Runs tests and builds extension
   - Publishes to marketplace
   - Creates GitHub release

### Option 2: Manual Release

1. Go to your GitHub repository
2. Navigate to Actions → Release Extension
3. Click "Run workflow"
4. Enter the version number (e.g., `1.0.0`)
5. Click "Run workflow"

## Monitoring

### Check Release Status

1. **GitHub Actions:**
   - Go to Actions tab in your repository
   - Monitor workflow progress
   - Check logs for any issues

2. **VS Code Marketplace:**
   - Visit [VS Code Marketplace](https://marketplace.visualstudio.com/manage)
   - Check your extension status
   - Monitor download stats

3. **GitHub Releases:**
   - Check Releases tab for new release
   - Download VSIX if needed

## Troubleshooting

### Common Issues

1. **Invalid Token:**
   - Regenerate VSCE_PAT in Azure DevOps
   - Update GitHub secret

2. **Publisher Mismatch:**
   - Ensure package.json publisher matches your marketplace account
   - Contact marketplace support if needed

3. **Version Conflicts:**
   - Ensure version doesn't already exist
   - Use semantic versioning (x.y.z)

4. **Test Failures:**
   - Check test logs in Actions
   - Fix tests before releasing

### Debug Commands

```bash
# Test locally before release
npm run compile
npm run lint
npm test

# Package locally
npx @vscode/vsce package

# Validate package
npx @vscode/vsce ls
```

## Version Management

The CI/CD system uses semantic versioning:
- **Patch** (1.0.1): Bug fixes
- **Minor** (1.1.0): New features, backward compatible
- **Major** (2.0.0): Breaking changes

Use appropriate version bumps:
```bash
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

## Security

- Never commit tokens to repository
- Use GitHub secrets for sensitive data
- Regularly rotate access tokens
- Monitor repository access

## Support

For issues with:
- **GitHub Actions**: Check workflow logs
- **Marketplace**: Contact [VS Code support](https://code.visualstudio.com/docs/editor/extension-marketplace#_extension-authoring)
- **Extension**: Create GitHub issue