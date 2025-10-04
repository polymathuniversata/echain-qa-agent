#!/usr/bin/env bash

# Pre-push hook to run comprehensive QA checks before pushing
# This ensures high quality before sharing code with the team

echo "🛡️ Running comprehensive QA checks before push..."

# Get the project root
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

# Check if we're in the qa-agent-package directory
if [[ "$PROJECT_ROOT" == *"/qa-agent-package" ]]; then
    echo "📦 Running full QA suite for qa-agent-package..."

    # Run full QA suite for the package itself
    if command -v bun &> /dev/null; then
        bun run type-check
        if [ $? -ne 0 ]; then
            echo "❌ TypeScript compilation failed. Fix before pushing."
            exit 1
        fi

        bun run lint
        if [ $? -ne 0 ]; then
            echo "❌ Linting failed. Fix before pushing."
            exit 1
        fi

        # Build the package
        bun run build
        if [ $? -ne 0 ]; then
            echo "❌ Build failed. Fix before pushing."
            exit 1
        fi
    else
        npm run type-check
        if [ $? -ne 0 ]; then
            echo "❌ TypeScript compilation failed. Fix before pushing."
            exit 1
        fi

        npm run lint
        if [ $? -ne 0 ]; then
            echo "❌ Linting failed. Fix before pushing."
            exit 1
        fi

        npm run build
        if [ $? -ne 0 ]; then
            echo "❌ Build failed. Fix before pushing."
            exit 1
        fi
    fi

    echo "✅ QA checks passed for qa-agent-package"
    exit 0
fi

# For other projects, run comprehensive QA checks
if [ -f "$PROJECT_ROOT/package.json" ]; then
    # Check if QA agent is available
    if [ -d "$PROJECT_ROOT/node_modules/@echain/qa-agent" ] || command -v echain-qa &> /dev/null; then
        echo "🔍 Running comprehensive QA agent checks..."

        # Run full QA suite (not dry-run for pre-push)
        if command -v echain-qa &> /dev/null; then
            echain-qa run --verbose
        elif [ -f "$PROJECT_ROOT/node_modules/.bin/echain-qa" ]; then
            "$PROJECT_ROOT/node_modules/.bin/echain-qa" run --verbose
        fi

        if [ $? -ne 0 ]; then
            echo "❌ QA checks failed. Please fix critical issues before pushing."
            echo "💡 Run 'echain-qa run' locally to identify and fix issues."
            echo "💡 Use 'echain-qa run --dry-run' for faster iterative checks."
            exit 1
        fi

        echo "✅ All QA checks passed - ready for push!"
    else
        echo "⚠️  QA agent not found. Consider installing @echain/qa-agent for automated quality assurance."
        echo "   npm install --save-dev @echain/qa-agent"
        echo "   # or globally:"
        echo "   npm install -g @echain/qa-agent"
    fi
else
    echo "ℹ️  Not a Node.js project, skipping QA checks"
fi

exit 0