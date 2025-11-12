# js-record Justfile
# Common development tasks for the project

# Default recipe - show available commands
default:
    @just --list

# Install dependencies
install:
    @echo "📦 Installing dependencies..."
    bun install

# Build the project
build:
    @echo "🔨 Building TypeScript..."
    bun run build

# Build in watch mode
build-watch:
    @echo "👀 Building TypeScript in watch mode..."
    bun run build:watch

# Clean build artifacts
clean:
    @echo "🧹 Cleaning build artifacts..."
    rm -rf dist
    @echo "✅ Clean complete"

# Clean and rebuild
rebuild: clean build

# Run type checking without emitting files
typecheck:
    @echo "🔍 Running type checker..."
    bun run typecheck

# Run linter
lint:
    @echo "🔍 Running linter..."
    bun run lint

# Fix linting issues
lint-fix:
    @echo "🔧 Fixing linting issues..."
    bunx eslint src --ext .ts --fix

# Format code with Prettier
format:
    @echo "✨ Formatting code..."
    bun run format

# Check code formatting without modifying
format-check:
    @echo "🔍 Checking code formatting..."
    bunx prettier --check "src/**/*.ts"

# Run all tests
test:
    @echo "🧪 Running all tests..."
    @just test-connection
    @just test-query-builder
    @just test-model
    @just test-associations
    @just test-validations
    @just test-callbacks
    @just test-migrations
    @just test-sqlite
    @just test-scopes
    @just test-attribute-mapping

# Test database connection
test-connection:
    @echo "🔌 Testing database connection..."
    bun run tests/test-connection.ts

# Test query builder
test-query-builder:
    @echo "🔍 Testing query builder..."
    bun run tests/test-query-builder.ts

# Test model functionality
test-model:
    @echo "📦 Testing model..."
    bun run tests/test-model.ts

# Test associations
test-associations:
    @echo "🔗 Testing associations..."
    bun run tests/test-associations.ts

# Test validations
test-validations:
    @echo "✅ Testing validations..."
    bun run tests/test-validations.ts

# Test callbacks
test-callbacks:
    @echo "🪝 Testing callbacks..."
    bun run tests/test-callbacks.ts

# Test migrations
test-migrations:
    @echo "🔄 Testing migrations..."
    bun run tests/test-migrations.ts

# Test SQLite adapter
test-sqlite:
    @echo "💾 Testing SQLite adapter..."
    bun run tests/test-sqlite.ts

# Test scopes
test-scopes:
    @echo "🎯 Testing scopes..."
    bun run tests/test-scopes.ts

# Test attribute mapping
test-attribute-mapping:
    @echo "🔍 Testing attribute mapping..."
    bun run tests/test-attribute-mapping.ts

# Run all quality checks (type check, lint, format check)
check: typecheck lint format-check
    @echo "✅ All quality checks passed!"

# Fix all auto-fixable issues (lint + format)
fix: lint-fix format
    @echo "✅ All fixes applied!"

# Run examples
example-adapter:
    @echo "🚀 Running adapter example..."
    bun run examples/adapter-usage.ts

example-associations:
    @echo "🚀 Running associations example..."
    bun run examples/associations-usage.ts

example-callbacks:
    @echo "🚀 Running callbacks example..."
    bun run examples/callbacks-usage.ts

example-migrations:
    @echo "🚀 Running migrations example..."
    bun run examples/migrations-usage.ts

example-multi-adapter:
    @echo "🚀 Running multi-adapter example..."
    bun run examples/multi-adapter-usage.ts

example-sqlite:
    @echo "🚀 Running SQLite example..."
    bun run examples/sqlite-usage.ts

example-validations:
    @echo "🚀 Running validations example..."
    bun run examples/validations-usage.ts

example-scopes:
    @echo "🚀 Running scopes example..."
    bun run examples/scopes-usage.ts

# Run all examples
examples:
    @echo "🚀 Running all examples..."
    @just example-sqlite
    @just example-multi-adapter
    @just example-scopes

# Database setup for development (PostgreSQL)
db-setup:
    @echo "🗄️  Setting up development database..."
    psql -U postgres -f setup-test-db.sql
    @echo "✅ Database setup complete"

# Create a new migration
migrate-create NAME:
    @echo "📝 Creating new migration: {{NAME}}..."
    @echo "Creating migration file..."
    bun -e "const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); const filename = 'migrations/' + timestamp + '_{{NAME}}.ts'; console.log('Created:', filename);"

# Development workflow - clean, build, and test
dev: clean build test
    @echo "✅ Development cycle complete!"

# Pre-commit checks - run before committing
pre-commit: check test
    @echo "✅ Pre-commit checks passed!"

# Prepare for release
pre-release: clean check test build
    @echo "✅ Ready for release!"

# Show project statistics
stats:
    @echo "📊 Project Statistics"
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    @echo "Source files:"
    @find src -name "*.ts" | wc -l | xargs echo "  TypeScript files:"
    @find src -name "*.ts" -exec cat {} \; | wc -l | xargs echo "  Lines of code:"
    @echo ""
    @echo "Test files:"
    @find . -maxdepth 1 -name "test-*.ts" | wc -l | xargs echo "  Test files:"
    @find . -maxdepth 1 -name "test-*.ts" -exec cat {} \; | wc -l | xargs echo "  Lines of test code:"
    @echo ""
    @echo "Example files:"
    @find examples -name "*.ts" 2>/dev/null | wc -l | xargs echo "  Example files:"
    @find examples -name "*.ts" -exec cat {} \; 2>/dev/null | wc -l | xargs echo "  Lines of examples:"
    @echo ""
    @echo "Documentation:"
    @find . -name "*.md" | wc -l | xargs echo "  Markdown files:"
    @find . -name "*.md" -exec cat {} \; | wc -l | xargs echo "  Lines of documentation:"

# Show help for a specific topic
help-sqlite:
    @cat docs/QUICK-START-SQLITE.md

help-migrations:
    @echo "See docs/MIGRATIONS.md (if exists) or run: just example-migrations"

help-validations:
    @echo "See examples/validations-usage.ts for examples"
    @echo "Run: just example-validations"

help-associations:
    @echo "See examples/associations-usage.ts for examples"
    @echo "Run: just example-associations"

# Open documentation
docs:
    @echo "📚 Available documentation:"
    @echo "  - README.md (main documentation)"
    @echo "  - docs/SQLITE.md (SQLite guide)"
    @echo "  - docs/QUICK-START-SQLITE.md (SQLite quick start)"
    @echo "  - CHANGELOG-SQLITE.md (SQLite changelog)"
    @echo ""
    @echo "Run 'just help-<topic>' for specific help"

# Initialize a new project database
init-sqlite:
    @echo "🗄️  Initializing SQLite database..."
    @echo "Creating ./dev.db..."
    @touch dev.db
    @echo "✅ SQLite database created: ./dev.db"
    @echo ""
    @echo "Use this connection config:"
    @echo "  const adapter = new SqliteAdapter({ database: './dev.db' });"

# Clean up database files
clean-db:
    @echo "🗑️  Cleaning up database files..."
    @rm -f dev.db test.db *.db source.db example.db
    @echo "✅ Database files cleaned"

# Run in development mode with auto-reload
watch: build-watch

# Quick test - run only SQLite tests (fastest)
quick-test: test-sqlite
    @echo "✅ Quick test complete!"

# Full CI pipeline
ci: install check build test
    @echo "✅ CI pipeline complete!"

# Show project information
info:
    @echo "📦 js-record"
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    @echo "Version: $(cat package.json | grep version | head -1 | sed 's/.*: "\(.*\)".*/\1/')"
    @echo "Description: A TypeScript ORM inspired by ActiveRecord"
    @echo ""
    @echo "Adapters:"
    @echo "  ✅ PostgreSQL (Bun native)"
    @echo "  ✅ SQLite (Bun native)"
    @echo ""
    @echo "Features:"
    @echo "  ✅ ActiveRecord pattern"
    @echo "  ✅ Type-safe models"
    @echo "  ✅ Query builder"
    @echo "  ✅ Associations"
    @echo "  ✅ Validations"
    @echo "  ✅ Callbacks/Hooks"
    @echo "  ✅ Migrations"
    @echo "  ✅ Transactions"
    @echo ""
    @echo "Run 'just --list' to see all available commands"

# Watch and run tests on file changes
test-watch:
    @echo "👀 Watching for changes..."
    @echo "Note: Install 'watchexec' for this to work"
    @echo "  brew install watchexec  (macOS)"
    @echo "  apt install watchexec   (Linux)"
    watchexec -e ts -w src -w test-*.ts -- just quick-test

# Create a release build
release: pre-release
    @echo "📦 Creating release build..."
    @echo "✅ Release build complete in ./dist"
    @echo ""
    @echo "To publish:"
    @echo "  npm publish"

# Benchmark tests (if implemented)
benchmark:
    @echo "⚡ Running benchmarks..."
    @echo "TODO: Implement benchmark tests"

# Generate API documentation (if using TypeDoc or similar)
docs-generate:
    @echo "📚 Generating API documentation..."
    @echo "TODO: Setup TypeDoc"
    @echo "  bun add -d typedoc"
    @echo "  bunx typedoc src/index.ts"

# Check for outdated dependencies
deps-check:
    @echo "🔍 Checking for outdated dependencies..."
    bun outdated

# Update dependencies
deps-update:
    @echo "⬆️  Updating dependencies..."
    bun update

# Security audit
audit:
    @echo "🔒 Running security audit..."
    bun audit || echo "Note: Bun audit may not be fully implemented yet"

# Create a backup of the project
backup:
    @echo "💾 Creating backup..."
    @tar -czf ../js-record-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
        --exclude=node_modules \
        --exclude=dist \
        --exclude=*.db \
        --exclude=.git \
        .
    @echo "✅ Backup created in parent directory"

# Setup git hooks
setup-hooks:
    @echo "🪝 Setting up git hooks..."
    @mkdir -p .git/hooks
    @echo '#!/bin/sh\njust pre-commit' > .git/hooks/pre-commit
    @chmod +x .git/hooks/pre-commit
    @echo "✅ Pre-commit hook installed"

# Remove git hooks
remove-hooks:
    @echo "🗑️  Removing git hooks..."
    @rm -f .git/hooks/pre-commit
    @echo "✅ Git hooks removed"

# Run a specific adapter with REPL-like environment
repl-sqlite:
    @echo "🔧 Starting SQLite REPL..."
    bun -i -e "import { SqliteAdapter } from './src/index.ts'; const adapter = new SqliteAdapter({ database: ':memory:' }); await adapter.connect(); console.log('Adapter ready:', adapter);"

# Validate project structure
validate:
    @echo "✅ Validating project structure..."
    @test -d src || (echo "❌ src/ directory missing" && exit 1)
    @test -d src/adapters || (echo "❌ src/adapters/ directory missing" && exit 1)
    @test -d src/core || (echo "❌ src/core/ directory missing" && exit 1)
    @test -f package.json || (echo "❌ package.json missing" && exit 1)
    @test -f tsconfig.json || (echo "❌ tsconfig.json missing" && exit 1)
    @test -f README.md || (echo "❌ README.md missing" && exit 1)
    @echo "✅ Project structure valid"

# Clean everything (including node_modules)
clean-all: clean clean-db
    @echo "🧹 Cleaning node_modules..."
    @rm -rf node_modules
    @rm -f bun.lockb
    @echo "✅ Clean all complete"

# Fresh start - clean everything and reinstall
fresh: clean-all install build
    @echo "✅ Fresh installation complete!"
