#!/bin/bash
# =============================================================================
# Praedixa - Script de setup environnement de développement
# =============================================================================

set -e

echo "🚀 Setting up Praedixa development environment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js 22+ is required"
    exit 1
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "${GREEN}✓${NC} pnpm $PNPM_VERSION"
else
    echo -e "${YELLOW}!${NC} pnpm not found, installing..."
    npm install -g pnpm
fi

# Setup Node.js environment
echo ""
echo "📦 Setting up Node.js environment..."
pnpm install

# Setup environment variables
echo ""
echo "🔐 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}!${NC} Created .env from .env.example"
    echo -e "${YELLOW}!${NC} Please edit .env with your values"
else
    echo -e "${GREEN}✓${NC} .env already exists"
fi

# Setup pre-commit hooks
echo ""
echo "🪝 Setting up pre-commit hooks..."
if command -v pre-commit &> /dev/null; then
    pre-commit install --install-hooks
    echo -e "${GREEN}✓${NC} Pre-commit hooks installed"
else
    echo -e "${YELLOW}!${NC} pre-commit not found, install via 'pipx install pre-commit' or 'brew install pre-commit'"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your configuration"
echo "  2. Run 'pnpm dev' to start the landing page"
echo ""
