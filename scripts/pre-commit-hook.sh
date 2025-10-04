#!/usr/bin/env bash

# Pre-commit hook to run QA checks before commits
# This ensures code quality before any commit

echo "🛡️ Running QA checks before commit..."

# Get the project root (works from any subdirectory)
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

# Check if we're in the qa-agent-package directory
if [[ "$PROJECT_ROOT" == *"/qa-agent-package" ]]; then
    echo "📦 Running QA checks for qa-agent-package..."

    # Run type checking and linting for the package itself
    if command -v bun &> /dev/null; then
        bun run type-check
        if [ $? -ne 0 ]; then
            echo "❌ TypeScript errors found. Please fix before committing."
            exit 1
        fi

        bun run lint
        if [ $? -ne 0 ]; then
            echo "❌ Linting errors found. Please fix before committing."
            exit 1
        fi
    else
        npm run type-check
        if [ $? -ne 0 ]; then
            echo "❌ TypeScript errors found. Please fix before committing."
            exit 1
        fi

        npm run lint
        if [ $? -ne 0 ]; then
            echo "❌ Linting errors found. Please fix before committing."
            exit 1
        fi
    fi

    echo "✅ QA checks passed for qa-agent-package"
    exit 0
fi

# For other projects, check if QA agent is available
if [ -f "$PROJECT_ROOT/package.json" ]; then
    # Check if QA agent is installed locally or globally
    if [ -d "$PROJECT_ROOT/node_modules/@echain/qa-agent" ] || command -v echain-qa &> /dev/null; then
        echo "🔍 Running QA agent checks..."

        # Run QA checks (use dry-run for faster pre-commit checks)
        if command -v echain-qa &> /dev/null; then
            echain-qa run --dry-run --verbose
        elif [ -f "$PROJECT_ROOT/node_modules/.bin/echain-qa" ]; then
            "$PROJECT_ROOT/node_modules/.bin/echain-qa" run --dry-run --verbose
        fi

        if [ $? -ne 0 ]; then
            echo "❌ QA checks failed. Please fix issues before committing."
            echo "💡 Run 'echain-qa run' to see detailed results and fix issues."
            exit 1
        fi

        echo "✅ QA checks passed"
    else
        echo "⚠️  QA agent not found. Consider installing @echain/qa-agent for automated quality checks."
        echo "   npm install --save-dev @echain/qa-agent"
    fi
else
    echo "ℹ️  Not a Node.js project, skipping QA checks"
fi

exit 0