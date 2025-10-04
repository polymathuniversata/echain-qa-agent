#!/usr/bin/env bash

# Setup script to install QA agent git hooks
# Run this in any project to enable automatic QA checks

set -e

HOOKS_DIR=".git/hooks"
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

echo "🔧 Setting up QA Agent Git Hooks..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository. Please run this from the root of a git repository."
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-commit hook
if [ ! -f "$PRE_COMMIT_HOOK" ] || [ ! -x "$PRE_COMMIT_HOOK" ]; then
    echo "📋 Installing pre-commit hook..."
    cat > "$PRE_COMMIT_HOOK" << 'EOF'
#!/usr/bin/env bash

# Pre-commit hook to run QA checks before commits
echo "🛡️ Running QA checks before commit..."

PROJECT_ROOT="$(git rev-parse --show-toplevel)"

if [ -f "$PROJECT_ROOT/package.json" ]; then
    if [ -d "$PROJECT_ROOT/node_modules/@echain/qa-agent" ] || command -v echain-qa &> /dev/null; then
        echo "🔍 Running QA agent checks..."

        if command -v echain-qa &> /dev/null; then
            echain-qa run --dry-run --verbose
        elif [ -f "$PROJECT_ROOT/node_modules/.bin/echain-qa" ]; then
            "$PROJECT_ROOT/node_modules/.bin/echain-qa" run --dry-run --verbose
        fi

        if [ $? -ne 0 ]; then
            echo "❌ QA checks failed. Please fix issues before committing."
            exit 1
        fi

        echo "✅ QA checks passed"
    else
        echo "⚠️  QA agent not found. Install with: npm install --save-dev @echain/qa-agent"
    fi
fi

exit 0
EOF

    chmod +x "$PRE_COMMIT_HOOK"
    echo "✅ Pre-commit hook installed"
else
    echo "ℹ️  Pre-commit hook already exists"
fi

# Install pre-push hook
if [ ! -f "$PRE_PUSH_HOOK" ] || [ ! -x "$PRE_PUSH_HOOK" ]; then
    echo "📋 Installing pre-push hook..."
    cat > "$PRE_PUSH_HOOK" << 'EOF'
#!/usr/bin/env bash

# Pre-push hook to run comprehensive QA checks before pushing
echo "🛡️ Running comprehensive QA checks before push..."

PROJECT_ROOT="$(git rev-parse --show-toplevel)"

if [ -f "$PROJECT_ROOT/package.json" ]; then
    if [ -d "$PROJECT_ROOT/node_modules/@echain/qa-agent" ] || command -v echain-qa &> /dev/null; then
        echo "🔍 Running comprehensive QA agent checks..."

        if command -v echain-qa &> /dev/null; then
            echain-qa run --verbose
        elif [ -f "$PROJECT_ROOT/node_modules/.bin/echain-qa" ]; then
            "$PROJECT_ROOT/node_modules/.bin/echain-qa" run --verbose
        fi

        if [ $? -ne 0 ]; then
            echo "❌ QA checks failed. Please fix critical issues before pushing."
            exit 1
        fi

        echo "✅ All QA checks passed - ready for push!"
    else
        echo "⚠️  QA agent not found. Install with: npm install --save-dev @echain/qa-agent"
    fi
fi

exit 0
EOF

    chmod +x "$PRE_PUSH_HOOK"
    echo "✅ Pre-push hook installed"
else
    echo "ℹ️  Pre-push hook already exists"
fi

echo ""
echo "🎉 QA Agent Git Hooks Setup Complete!"
echo ""
echo "Hooks installed:"
echo "  • pre-commit: Runs fast QA checks before each commit"
echo "  • pre-push: Runs comprehensive QA checks before pushing"
echo ""
echo "To test the hooks:"
echo "  1. Make a small change to any file"
echo "  2. Run: git add . && git commit -m 'test'"
echo "  3. The QA checks should run automatically"