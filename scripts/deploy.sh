#!/bin/bash

# ANS Registry Core v0.1 Deployment Script
# Deploy to npm and demo to Vercel

set -e

echo "🚀 ANS Registry Core v0.1 Deployment"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run from project root."
    exit 1
fi

# Check if we have the necessary tools
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed." >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git is required but not installed." >&2; exit 1; }

echo "📋 Pre-deployment checks..."

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: Uncommitted changes detected."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm test

# Build project
echo "🏗️  Building project..."
npm run build

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found after build"
    exit 1
fi

echo "✅ Build successful!"

# Check npm auth
echo "🔐 Checking npm authentication..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Error: Not logged into npm. Run 'npm login' first."
    exit 1
fi

echo "✅ npm authentication verified"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📝 Current version: v$CURRENT_VERSION"

# Publish to npm
echo "📦 Publishing to npm..."
npm publish

if [ $? -eq 0 ]; then
    echo "✅ Successfully published @ansregistry/core@$CURRENT_VERSION to npm!"
else
    echo "❌ npm publish failed"
    exit 1
fi

# Deploy demo if Vercel is available
if command -v vercel >/dev/null 2>&1; then
    echo "🌐 Deploying demo to Vercel..."
    
    # Copy demo files to dist for deployment
    cp demo/index.html dist/
    cp demo/well-known-example.json dist/
    
    # Deploy to Vercel
    vercel --prod --yes
    
    if [ $? -eq 0 ]; then
        echo "✅ Demo deployed successfully!"
    else
        echo "⚠️  Demo deployment failed, but npm package published successfully"
    fi
else
    echo "ℹ️  Vercel CLI not found, skipping demo deployment"
    echo "   Install with: npm i -g vercel"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo "📦 Package: https://www.npmjs.com/package/@ansregistry/core"
echo "🌐 Registry: https://ansregistry.org"
echo "📚 GitHub: https://github.com/ANSRegistry/core"
echo ""
echo "Next steps:"
echo "1. 📢 Announce on social media"
echo "2. 📧 Email early access list"
echo "3. 🏷️  Create git tag: git tag v$CURRENT_VERSION && git push --tags"
echo "4. 📰 Update README with new version info"
echo ""
echo "🚀 ANS Registry v$CURRENT_VERSION is now live!"