#!/bin/bash

# Pre-commit validation script
# Run this before committing to ensure code quality

set -e

echo "🔍 Running pre-commit checks..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

# Run linting
echo "🧹 Running linter..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm test

# Check package can be built
echo "📦 Testing package build..."
npx @vscode/vsce package --out test-build.vsix > /dev/null
rm -f test-build.vsix

echo "✅ All checks passed!"
echo "🎉 Ready to commit!"