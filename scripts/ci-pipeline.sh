#!/usr/bin/env bash

# CI/CD integration script for automated QA checks
# This script can be used in GitHub Actions, Jenkins, or other CI systems

set -e

echo "🔄 Starting CI/CD QA Pipeline..."

# Set default values
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-true}"
STRICT_MODE="${STRICT_MODE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if QA agent is available
check_qa_agent() {
    if command -v echain-qa &> /dev/null; then
        QA_CMD="echain-qa"
        return 0
    elif [ -f "node_modules/.bin/echain-qa" ]; then
        QA_CMD="./node_modules/.bin/echain-qa"
        return 0
    elif [ -f "dist/cli.js" ]; then
        # Running from within the qa-agent-package itself
        QA_CMD="node dist/cli.js"
        return 0
    else
        log_error "QA agent not found. Please install @echain/qa-agent"
        return 1
    fi
}

# Run QA checks with appropriate flags
run_qa_checks() {
    local check_type="$1"
    local description="$2"

    log_info "Running $description..."

    local cmd="$QA_CMD $check_type"

    # Only add dry-run and verbose for the full run command
    if [ "$check_type" = "run" ]; then
        [ "$DRY_RUN" = "true" ] && cmd="$cmd --dry-run"
        [ "$VERBOSE" = "true" ] && cmd="$cmd --verbose"
    fi

    if eval "$cmd"; then
        log_success "$description completed successfully"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Main CI pipeline
main() {
    log_info "Starting QA Agent CI/CD Pipeline"
    log_info "DRY_RUN: $DRY_RUN, VERBOSE: $VERBOSE, STRICT_MODE: $STRICT_MODE"

    # Check QA agent availability
    if ! check_qa_agent; then
        exit 1
    fi

    # Initialize QA configuration if needed
    if [ ! -f ".qa-config.json" ]; then
        log_info "Initializing QA configuration..."
        $QA_CMD init
    fi

    local failures=0

    # Run linting checks
    if ! run_qa_checks "lint" "code quality checks"; then
        ((failures++))
        [ "$STRICT_MODE" = "true" ] && exit 1
    fi

    # Run security checks
    if ! run_qa_checks "security" "security analysis"; then
        ((failures++))
        [ "$STRICT_MODE" = "true" ] && exit 1
    fi

    # Run build verification
    if ! run_qa_checks "build" "build verification"; then
        ((failures++))
        [ "$STRICT_MODE" = "true" ] && exit 1
    fi

    # Run tests (only if not in dry-run mode)
    if [ "$DRY_RUN" != "true" ]; then
        if ! run_qa_checks "test" "test execution"; then
            ((failures++))
            [ "$STRICT_MODE" = "true" ] && exit 1
        fi
    else
        log_info "Skipping tests in dry-run mode"
    fi

    # Final summary
    echo
    if [ $failures -eq 0 ]; then
        log_success "All QA checks passed! 🎉"
        log_info "Pipeline completed successfully"
        exit 0
    else
        log_warning "QA pipeline completed with $failures failed check(s)"
        log_info "Review the output above for details"
        exit 1
    fi
}

# Run main function
main "$@"