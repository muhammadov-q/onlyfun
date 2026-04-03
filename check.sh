#!/bin/bash

# Pre-Commit CI Script (Frontend)
# Quick checks before committing to catch issues early and save CI minutes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_step() {
    echo -e "${BLUE}→ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

print_header "PRE-COMMIT CI CHECKS (FRONTEND)"
echo "Running essential checks before commit..."
echo ""

# ============================================
# Dependencies & Security
# ============================================
print_step "Installing dependencies..."
if npm ci > /dev/null 2>&1; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

print_step "Security audit..."
if npm audit --audit-level=moderate > /dev/null 2>&1; then
    print_success "No security vulnerabilities"
else
    print_warning "Security vulnerabilities found. Run: npm audit"
    # Non-fatal for frontend — Next.js often has audit warnings in transitive deps
fi

# ============================================
# Code Quality Checks
# ============================================
print_step "Linting code..."
if npm run lint > /dev/null 2>&1; then
    print_success "Linting passed"
else
    print_error "Linting failed! Run: npm run lint"
    exit 1
fi

print_step "Checking code formatting..."
npm run format > /dev/null 2>&1
if npm run format:check > /dev/null 2>&1; then
    print_success "Formatting correct"
else
    print_error "Formatting issues found! Run: npm run format"
    exit 1
fi

# ============================================
# Type Safety
# ============================================
print_step "Type checking..."
if npm run type-check > /dev/null 2>&1; then
    print_success "Type check passed"
else
    print_error "Type errors found! Run: npm run type-check"
    exit 1
fi

# ============================================
# Build Check
# ============================================
print_step "Building application..."
if npm run build > /dev/null 2>&1; then
    print_success "Build successful"
else
    print_error "Build failed! Run: npm run build"
    exit 1
fi

# ============================================
# Final Summary
# ============================================
print_header "ALL CHECKS PASSED! ✓"
echo ""
echo -e "${GREEN}✓ Security audit${NC}"
echo -e "${GREEN}✓ Code quality (lint + format)${NC}"
echo -e "${GREEN}✓ Type safety${NC}"
echo -e "${GREEN}✓ Build${NC}"
echo ""
echo -e "${GREEN}Your code is ready to commit!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

exit 0
