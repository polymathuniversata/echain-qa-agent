#!/usr/bin/env bash

# Development server wrapper that runs QA checks before starting
# Use this instead of direct npm/yarn/bun dev commands

set -e

echo "🚀 Starting development server with QA checks..."

# Check if QA agent is available
if command -v echain-qa &> /dev/null || [ -f "node_modules/.bin/echain-qa" ]; then
    echo "🛡️ Running pre-dev QA checks..."

    # Run quick QA checks before starting dev server
    if command -v echain-qa &> /dev/null; then
        echain-qa run --dry-run
    else
        ./node_modules/.bin/echain-qa run --dry-run
    fi

    if [ $? -ne 0 ]; then
        echo "❌ QA checks failed. Please fix issues before starting dev server."
        echo "💡 Run 'echain-qa run' to see detailed results."
        exit 1
    fi

    echo "✅ QA checks passed - starting dev server..."
else
    echo "⚠️  QA agent not found. Consider installing for automated quality checks."
    echo "   npm install --save-dev @echain/qa-agent"
fi

# Determine which package manager to use
if command -v bun &> /dev/null && [ -f "bun.lockb" ]; then
    echo "📦 Using Bun to start dev server..."
    bun run dev "$@"
elif command -v yarn &> /dev/null && [ -f "yarn.lock" ]; then
    echo "📦 Using Yarn to start dev server..."
    yarn dev "$@"
else
    echo "📦 Using NPM to start dev server..."
    npm run dev "$@"
fi