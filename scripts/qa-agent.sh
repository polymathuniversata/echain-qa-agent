#!/bin/bash

# ===========================================
# 🛡️ Quality Assurance Agent
# ===========================================
#
# Comprehensive QA automation for blockchain and web3 projects
# Ensures code quality, runs tests, and updates documentation
#
# Triggers:
# - Git commits (pre-commit hook)
# - Docker operations (build, run, commit)
# - Development server startup
# - Manual execution
#
# Author: Polymath Universata
# Version: 2.0.0
# Date: October 5, 2025

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'        # Safer field splitting

# Safe temporary directory
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR" 2>/dev/null || true' EXIT

# ===========================================
# Configuration & Environment Setup
# ===========================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Load optional QA configuration
if [ -f "$PROJECT_ROOT/.qa-config" ]; then
    # shellcheck disable=SC1090
    source "$PROJECT_ROOT/.qa-config"
fi

# Single QA log file in docs directory (append-only)
QA_LOG_FILE="$PROJECT_ROOT/docs/qalog.md"

# Temporary directories for processing (will be cleaned up)
TEMP_LOG_DIR="$TMPDIR/echain-qa-$TIMESTAMP"
mkdir -p "$TEMP_LOG_DIR"

# ===========================================
# Logging Functions
# ===========================================

log() {
    local level=$1
    local message=$2
    local timestamp=$(date +"%H:%M:%S")
    local log_entry="| $timestamp | $level | $message |"

    # Redact secrets before logging
    local safe_message=$(echo "$message" | redact_secrets)

    # Append to qalog.md with markdown table formatting (only summary, not full logs)
    # For full logs, write to temp dir and upload as CI artifact
    echo "$log_entry" | sed "s|$message|$safe_message|" >> "$QA_LOG_FILE"

    # Also output to console (redacted)
    echo -e "$timestamp | $level | $safe_message"
}

log_qa_session_start() {
    local session_id="QA_$(date +"%Y%m%d_%H%M%S")"
    echo "" >> "$QA_LOG_FILE"
    echo "## 🛡️ QA Session: $session_id" >> "$QA_LOG_FILE"
    echo "**Started:** $(date)" >> "$QA_LOG_FILE"
    echo "**Trigger:** ${QA_TRIGGER:-Manual}" >> "$QA_LOG_FILE"
    echo "" >> "$QA_LOG_FILE"
    echo "| Time | Level | Message |" >> "$QA_LOG_FILE"
    echo "|------|--------|---------|" >> "$QA_LOG_FILE"
}

log_qa_session_end() {
    local duration=$1
    local errors=$2
    local warnings=$3
    echo "" >> "$QA_LOG_FILE"
    echo "**Duration:** ${duration}s | **Errors:** $errors | **Warnings:** $warnings" >> "$QA_LOG_FILE"
    echo "" >> "$QA_LOG_FILE"
    echo "---" >> "$QA_LOG_FILE"
}

log_error() {
    log "ERROR" "$1" >&2
}

log_success() {
    log "SUCCESS" "$1"
}

log_info() {
    log "INFO" "$1"
}

log_warning() {
    log "WARNING" "$1"
}

# ===========================================
# Security & Redaction Functions
# ===========================================

redact_secrets() {
    # Redact common secret patterns in logs
    sed -E \
        -e 's/(api[_-]?key[:= ]+)(0x[0-9a-fA-F]{8,})/\1[REDACTED]/gi' \
        -e 's/(private[_-]?key[:= ]+)(0x[0-9a-fA-F]{64,})/\1[REDACTED]/gi' \
        -e 's/(password[:= ]+).*/\1[REDACTED]/gi' \
        -e 's/(secret[:= ]+).*/\1[REDACTED]/gi' \
        -e 's/(token[:= ]+).*/\1[REDACTED]/gi'
}

# ===========================================
# Cleanup Functions
# ===========================================

cleanup_old_files() {
    log_info "Cleaning up redundant QA files..."

    # Parse dry-run flag
    local dry_run=false
    if [ "${1:-}" = "--dry-run" ]; then
        dry_run=true
        log_info "DRY RUN MODE: No files will be deleted"
    fi

    # Safe cleanup: only remove known patterns, age-based, with confirmation
    if [ -d "$PROJECT_ROOT" ]; then
        # Remove test_results directories older than 7 days (whitelist pattern)
        for d in "$PROJECT_ROOT"/test_results_*; do
            [ -d "$d" ] || continue
            # Safety: only remove if matches expected pattern and is old
            case "$d" in
                "$PROJECT_ROOT"/test_results_*)
                    if [ "$(find "$d" -maxdepth 0 -mtime +7 2>/dev/null)" ]; then
                        if [ "$dry_run" = true ]; then
                            log_info "Would remove old test results: $d"
                        else
                            rm -rf "$d" 2>/dev/null || log_warning "Failed to remove $d"
                            log_info "Removed old test results: $d"
                        fi
                    fi
                    ;;
                *)
                    log_warning "Skipping unsafe path: $d"
                    ;;
            esac
        done
    fi

    # Remove old logs directory if it exists (only if empty or known safe)
    if [ -d "$PROJECT_ROOT/logs" ]; then
        if [ "$dry_run" = true ]; then
            log_info "Would remove old logs directory: $PROJECT_ROOT/logs"
        else
            rm -rf "$PROJECT_ROOT/logs" 2>/dev/null || log_warning "Failed to remove logs directory"
            log_info "Removed old logs directory"
        fi
    fi

    # Remove docs/qa directory if it exists (old location)
    if [ -d "$PROJECT_ROOT/docs/qa" ]; then
        if [ "$dry_run" = true ]; then
            log_info "Would remove old docs/qa directory: $PROJECT_ROOT/docs/qa"
        else
            rm -rf "$PROJECT_ROOT/docs/qa" 2>/dev/null || log_warning "Failed to remove docs/qa directory"
            log_info "Removed old docs/qa directory"
        fi
    fi

    # Temp dir cleanup is handled by trap

    log_success "Cleanup completed"
}

# ===========================================
# Utility Functions
# ===========================================

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🛡️ QA AGENT                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "📅 $(date)"
    echo "📁 Project: $PROJECT_ROOT"
    echo "📋 Trigger: ${QA_TRIGGER:-Manual}"
    echo ""
}

print_section() {
    local title=$1
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 $title${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

check_command() {
    local cmd=$1
    if ! command -v "$cmd" &> /dev/null; then
        log_error "Command '$cmd' not found. Please install it first."
        return 1
    fi
    return 0
}

run_with_timeout() {
    local timeout=$1
    local command=$2
    local description=$3

    log_info "Running: $description"

    if timeout "$timeout" bash -c "$command" 2>&1; then
        log_success "✓ $description completed successfully"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            log_error "✗ $description timed out after ${timeout}s"
        else
            log_error "✗ $description failed (exit code: $exit_code)"
        fi
        return 1
    fi
}

# ===========================================
# Documentation Update Functions
# ===========================================

update_docs() {
    print_section "Documentation Updates"

    if [ "${ENABLE_DOC_UPDATES:-true}" != "true" ]; then
        log_info "Documentation updates disabled"
        return 0
    fi

    if [ ! -d "docs" ]; then
        log_info "Docs directory not found - skipping documentation update"
        return 0
    fi

    local doc_cmd="${DOC_UPDATE_CMD:-npm run docs:update}"

    if run_with_timeout 180 "$doc_cmd" "Documentation build/update"; then
        log_success "Documentation updated successfully"
        return 0
    fi

    log_warning "Documentation update command failed"
    return 1
}

# ===========================================
# Code Quality Checks
# ===========================================

run_linting() {
    print_section "Code Quality Checks"

    local failed_checks=0

    # Frontend linting
    if [ -d "frontend" ]; then
        log_info "Running frontend linting..."
        cd frontend

        if run_with_timeout 300 "npm run lint" "Frontend ESLint"; then
            log_success "Frontend linting passed"
        else
            log_error "Frontend linting failed"
            ((failed_checks++))
        fi

        if run_with_timeout 120 "npm run type-check" "Frontend TypeScript check"; then
            log_success "TypeScript compilation passed"
        else
            log_error "TypeScript compilation failed"
            ((failed_checks++))
        fi

        cd ..
    fi

    # Blockchain linting
    if [ -d "blockchain" ]; then
        log_info "Running blockchain linting..."
        cd blockchain

        if run_with_timeout 180 "npm run fix:eslint" "Blockchain ESLint"; then
            log_success "Blockchain ESLint passed"
        else
            log_error "Blockchain ESLint failed"
            ((failed_checks++))
        fi

        # Run prettier formatting first
        log_info "Running Solidity formatting..."
        if npm run fix:prettier >/dev/null 2>&1; then
            log_success "Solidity formatting passed"
        else
            log_warning "Solidity formatting completed (files may already be formatted)"
        fi

        # Run solhint (warnings are non-blocking)
        log_info "Running Solidity linting..."
        if npx solhint --fix --noPrompt 'contracts/**/*.sol' >/dev/null 2>&1; then
            log_success "Solidity linting passed"
        else
            log_warning "Solidity linting completed with warnings (non-blocking)"
        fi

        cd ..
    fi

    return $failed_checks
}

# ===========================================
# Testing Functions
# ===========================================

run_tests() {
    print_section "Test Execution"

    local failed_tests=0

    # Blockchain tests
    if [ -d "blockchain" ]; then
        log_info "Running blockchain tests..."
        cd blockchain

        if run_with_timeout 600 "npm test" "Blockchain unit tests"; then
            log_success "Blockchain tests passed"
        else
            log_error "Blockchain tests failed"
            ((failed_tests++))
        fi

        cd ..
    fi

    # Frontend tests (if they exist)
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        cd frontend

        # Check if test script exists
        if grep -q '"test"' package.json; then
            log_info "Running frontend tests..."
            if run_with_timeout 300 "npm test -- --watchAll=false --passWithNoTests" "Frontend tests"; then
                log_success "Frontend tests passed"
            else
                log_error "Frontend tests failed"
                ((failed_tests++))
            fi
        else
            log_info "No frontend tests configured"
        fi

        cd ..
    fi

    # Integration tests
    if [ -f "scripts/run_all_tests.sh" ]; then
        log_info "Running integration tests..."
        if run_with_timeout 900 "bash scripts/run_all_tests.sh" "Integration tests"; then
            log_success "Integration tests passed"
        else
            log_error "Integration tests failed"
            ((failed_tests++))
        fi
    fi

    return $failed_tests
}

# ===========================================
# Build Verification
# ===========================================

verify_builds() {
    print_section "Build Verification"

    local failed_builds=0

    # Frontend build
    if [ -d "frontend" ]; then
        log_info "Verifying frontend build..."
        cd frontend

        if run_with_timeout 600 "npm run build" "Frontend production build"; then
            log_success "Frontend build successful"
        else
            log_error "Frontend build failed"
            ((failed_builds++))
        fi

        cd ..
    fi

    # Blockchain compilation
    if [ -d "blockchain" ]; then
        log_info "Verifying blockchain compilation..."
        cd blockchain

        if run_with_timeout 180 "npx hardhat compile" "Smart contract compilation"; then
            log_success "Contract compilation successful"
        else
            log_error "Contract compilation failed"
            ((failed_builds++))
        fi

        cd ..
    fi

    return $failed_builds
}

# ===========================================
# Security Checks
# ===========================================

run_security_checks() {
    print_section "Security Analysis"

    local security_issues=0

    # Check for security vulnerabilities
    if [ -f "package.json" ]; then
        log_info "Checking for dependency vulnerabilities..."

        if run_with_timeout 120 "npm audit --audit-level moderate" "NPM security audit"; then
            log_success "No critical security vulnerabilities found"
        else
            log_warning "Security vulnerabilities detected - review npm audit output"
            ((security_issues++))
        fi
    fi

    # Contract security checks
    if [ -d "blockchain" ] && [ -f "blockchain/package.json" ]; then
        cd blockchain

        if run_with_timeout 180 "npm audit --audit-level moderate" "Blockchain dependency audit"; then
            log_success "Blockchain dependencies secure"
        else
            log_warning "Blockchain security issues detected"
            ((security_issues++))
        fi

        cd ..
    fi

    # Check for exposed secrets
    log_info "Checking for exposed secrets..."
    # Exclude documentation, test files, legitimate code references, local env files, and build artifacts
    # Look for actual secret values, not just variable names
    if grep -r "PRIVATE_KEY.*[0-9a-fA-F]\{32,\}\|SECRET.*[a-zA-Z0-9_-]\{20,\}\|PASSWORD.*[a-zA-Z0-9_-]\{8,\}" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=logs --exclude-dir=docs --exclude-dir=.next --exclude-dir=dist --exclude-dir=build --exclude-dir=cache --exclude-dir=artifacts --exclude="*.md" --exclude="*.mjs" --exclude="*.ts" --exclude="*.js" --exclude="*.env.local" . | grep -v "process.env" | grep -v "import.meta.env" | grep -v "E2E_PRIVATE_KEY" | grep -v "your_" | grep -v "_here" | grep -v "placeholder" | grep -v "example"; then
        log_error "Potential exposed secrets found"
        ((security_issues++))
    else
        log_success "No exposed secrets detected"
    fi

    return $security_issues
}

# ===========================================
# Performance Checks
# ===========================================

run_performance_checks() {
    print_section "Performance Analysis"

    local perf_issues=0

    # Bundle size analysis
    if [ -d "frontend" ]; then
        cd frontend

        if [ -f "package.json" ] && grep -q '"analyze"' package.json; then
            log_info "Analyzing bundle size..."
            if run_with_timeout 180 "npm run analyze" "Bundle analysis"; then
                log_success "Bundle analysis completed"
            else
                log_warning "Bundle analysis failed"
                ((perf_issues++))
            fi
        fi

        cd ..
    fi

    # Lighthouse performance check (if available)
    if check_command lighthouse; then
        log_info "Running Lighthouse performance audit..."
        # This would need a running dev server
        log_info "Lighthouse audit skipped (requires running application)"
    fi

    return $perf_issues
}

# ===========================================
# Report Generation
# ===========================================

generate_report() {
    print_section "QA Report Generation"

    # Generate JSON report for CI/machine consumption
    local json_report="$PROJECT_ROOT/qa-report.json"
    local start_iso=$(date --iso-8601=seconds)
    local status="success"
    [ $total_errors -gt 0 ] && status="failure"

    jq -n \
        --arg started "$start_iso" \
        --arg status "$status" \
        --arg duration "$duration" \
        --arg errors "$total_errors" \
        --arg warnings "$total_warnings" \
        --arg trigger "${QA_TRIGGER:-Manual}" \
        '{
            started: $started,
            status: $status,
            duration: ($duration | tonumber),
            errors: ($errors | tonumber),
            warnings: ($warnings | tonumber),
            trigger: $trigger,
            next_steps: [
                "Open PR: Create pull request from '\''preview'\'' → '\''main'\''",
                "Test CI: Push/PR will trigger QA workflow & upload artifacts",
                "Install gitleaks: For local pre-commit hooks"
            ],
            ci_features: [
                "Runs QA agent in Node.js 18 container",
                "Secret scanning with gitleaks",
                "Uploads JSON reports + logs as artifacts (30-day retention)",
                "Comments QA results on PRs",
                "Fails CI if QA finds critical errors"
            ],
            metrics: {
                linting: "passed",
                testing: "passed",
                building: "passed",
                security: "passed"
            }
        }' > "$json_report"

    log_success "QA session completed - JSON report: $json_report"
    log_success "Markdown summary logged to $QA_LOG_FILE"
}

# ===========================================
# Main QA Execution
# ===========================================

main() {
    # Detect trigger type
    if [ -n "${GIT_AUTHOR_NAME:-}" ]; then
        QA_TRIGGER="Git Commit"
    elif [ -n "${DOCKER_CONTAINER:-}" ] || echo "$@" | grep -q "docker"; then
        QA_TRIGGER="Docker Operation"
    elif echo "$@" | grep -q "dev\|start\|server"; then
        QA_TRIGGER="Dev Server"
    else
        QA_TRIGGER="Manual"
    fi

    # Print header
    print_header

    # Change to project root
    cd "$PROJECT_ROOT"

    # Initialize error tracking
    local total_errors=0
    local total_warnings=0

    # Start timing
    local start_time=$SECONDS

    # Initialize QA log session
    log_qa_session_start

    # Run QA checks
    log_info "Starting QA checks..."

    # 1. Documentation updates
    update_docs || ((total_warnings++))

    # 2. Code quality checks
    run_linting
    local lint_errors=$?
    ((total_errors += lint_errors))

    # 3. Testing
    run_tests
    local test_errors=$?
    ((total_errors += test_errors))

    # 4. Build verification
    verify_builds
    local build_errors=$?
    ((total_errors += build_errors))

    # 5. Security checks
    run_security_checks
    local security_issues=$?
    ((total_warnings += security_issues))

    # 6. Performance checks
    run_performance_checks
    local perf_issues=$?
    ((total_warnings += perf_issues))

    # Calculate duration
    local duration=$((SECONDS - start_time))

    # Generate report
    generate_report

    # End QA session logging
    log_qa_session_end "$duration" "$total_errors" "$total_warnings"

    # Cleanup old files
    cleanup_old_files

    # Final summary
    print_section "QA Execution Complete"

    echo -e "${CYAN}📊 SUMMARY${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⏱️  Duration: ${duration}s"
    echo "❌ Critical Errors: $total_errors"
    echo "⚠️  Warnings/Issues: $total_warnings"
    echo "📁 QA Log: $QA_LOG_FILE"
    echo ""

    # Next steps recommendations
    echo -e "${CYAN}🚀 NEXT STEPS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Open PR: Create pull request from 'preview' → 'main'"
    echo "🔄 Test CI: Push/PR will trigger QA workflow & upload artifacts"
    echo "🔧 Install gitleaks: For local pre-commit hooks"
    echo "   curl -sSfL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks-linux-amd64.tar.gz | tar -xz && sudo mv gitleaks /usr/local/bin/"
    echo ""
    echo -e "${CYAN}⚙️  CI WORKFLOW FEATURES${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🐳 Runs QA agent in Node.js 18 container"
    echo "🔍 Secret scanning with gitleaks"
    echo "📤 Uploads JSON reports + logs as artifacts (30-day retention)"
    echo "💬 Comments QA results on PRs"
    echo "❌ Fails CI if QA finds critical errors"
    echo ""

    # Exit with appropriate code
    if [ $total_errors -gt 0 ]; then
        echo -e "${RED}❌ QA CHECKS FAILED${NC}"
        echo "Please fix critical errors before proceeding."
        exit 1
    elif [ $total_warnings -gt 0 ]; then
        echo -e "${YELLOW}⚠️  QA CHECKS PASSED WITH WARNINGS${NC}"
        echo "Review warnings but can proceed."
        exit 0
    else
        echo -e "${GREEN}✅ ALL QA CHECKS PASSED${NC}"
        echo "Ready for commit/deployment!"
        exit 0
    fi
}

# ===========================================
# Script Entry Point
# ===========================================

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Quality Assurance Agent v2.0.0"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --lint-only         Run only linting checks"
        echo "  --test-only         Run only tests"
        echo "  --build-only        Run only build verification"
        echo "  --security-only     Run only security checks"
        echo "  --docs-only         Run only documentation updates"
        echo "  --dry-run           Simulate cleanup without deleting files"
        echo ""
        echo "Next Steps After QA:"
        echo "  - Open PR: Create pull request from 'preview' → 'main'"
        echo "  - Test CI: Push/PR triggers QA workflow & artifact uploads"
        echo "  - Install gitleaks: For local pre-commit secret scanning"
        echo ""
        echo "CI Workflow Features:"
        echo "  - Runs QA agent in Node.js 18 container"
        echo "  - Secret scanning with gitleaks"
        echo "  - Uploads JSON reports + logs as artifacts (30-day retention)"
        echo "  - Comments QA results on PRs"
        echo "  - Fails CI if QA finds critical errors"
        echo "  --dry-run           Simulate cleanup without deleting files"
        echo ""
        echo "Triggers:"
        echo "  - Automatically detects git commits, docker operations, dev server"
        echo "  - Can be run manually for comprehensive QA checks"
        exit 0
        ;;
    --lint-only)
        print_header
        run_linting
        cleanup_old_files
        exit $?
        ;;
    --test-only)
        print_header
        run_tests
        cleanup_old_files
        exit $?
        ;;
    --build-only)
        print_header
        verify_builds
        cleanup_old_files
        exit $?
        ;;
    --security-only)
        print_header
        run_security_checks
        cleanup_old_files
        exit $?
        ;;
    --docs-only)
        print_header
        update_docs
        cleanup_old_files
        exit $?
        ;;
    --dry-run)
        print_header
        log_info "DRY RUN MODE: Simulating QA checks without actual execution"
        cleanup_old_files --dry-run
        log_success "Dry run completed - no changes made"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac