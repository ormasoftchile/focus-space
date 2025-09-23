#!/bin/bash

# Release script for Focus Space extension
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Default to patch if no argument provided
VERSION_TYPE=${1:-patch}

echo "🚀 Starting release process..."

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Must be on main branch for release"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Ensure working directory is clean
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ Error: Working directory is not clean"
    echo "Please commit or stash changes before releasing"
    git status --short
    exit 1
fi

# Pull latest changes
echo "📡 Pulling latest changes..."
git pull origin main

# Run tests
echo "🧪 Running tests..."
npm test

# Bump version
echo "📦 Bumping version ($VERSION_TYPE)..."
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
echo "New version: $NEW_VERSION"

# Update changelog if it exists
if [ -f "CHANGELOG.md" ]; then
    echo "📝 Please update CHANGELOG.md with release notes for $NEW_VERSION"
    echo "Press Enter when ready to continue..."
    read
fi

# Commit version bump
echo "💾 Committing version bump..."
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
echo "🏷️  Creating release tag..."
git tag $NEW_VERSION
git push origin main
git push origin $NEW_VERSION

echo "✅ Release process initiated!"
echo "🎯 Version: $NEW_VERSION"
echo "📊 Monitor progress: https://github.com/ormasoftchile/focus-space/actions"
echo "🎉 Marketplace: https://marketplace.visualstudio.com/items?itemName=focus-space.focus-space"