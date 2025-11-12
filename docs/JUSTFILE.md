# Justfile Documentation

This project uses [Just](https://github.com/casey/just) as a command runner - think of it as a modern alternative to Make with a better syntax.

## Installation

### macOS

```bash
brew install just
```

### Linux

```bash
# Ubuntu/Debian
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Arch Linux
pacman -S just
```

### Windows

```powershell
# Using Scoop
scoop install just

# Using Chocolatey
choco install just
```

Or see [official installation guide](https://github.com/casey/just#installation).

## Quick Start

```bash
# List all available commands
just --list

# Or simply
just
```

## Common Commands

### Development Workflow

```bash
# Install dependencies
just install

# Build the project
just build

# Build in watch mode (auto-rebuild on changes)
just build-watch

# Clean build artifacts
just clean

# Clean and rebuild
just rebuild

# Development cycle: clean, build, and test
just dev

# Fresh start: clean everything and reinstall
just fresh
```

### Testing

```bash
# Run all tests
just test

# Run quick test (SQLite only - fastest)
just quick-test

# Run specific test
just test-sqlite
just test-model
just test-associations
just test-validations
just test-callbacks
just test-migrations

# Run a custom test file
just test-file path/to/test.ts

# Watch mode (requires watchexec)
just test-watch
```

### Code Quality

```bash
# Type checking
just typecheck

# Linting
just lint

# Fix linting issues
just lint-fix

# Format code
just format

# Check formatting without modifying
just format-check

# Run all checks (type, lint, format)
just check

# Fix all auto-fixable issues
just fix

# Pre-commit checks (run before committing)
just pre-commit
```

### Examples

```bash
# Run SQLite example
just example-sqlite

# Run multi-adapter example
just example-multi-adapter

# Run associations example
just example-associations

# Run all examples
just examples
```

### Database

```bash
# Initialize SQLite database
just init-sqlite

# Setup PostgreSQL database (requires psql)
just db-setup

# Clean database files
just clean-db
```

### Documentation & Help

```bash
# Show project info
just info

# Show project statistics
just stats

# View available documentation
just docs

# Help for specific topics
just help-sqlite
just help-validations
just help-associations
just help-migrations
```

### CI/CD

```bash
# Full CI pipeline
just ci

# Prepare for release
just pre-release

# Create release build
just release
```

### Git Hooks

```bash
# Setup pre-commit hooks
just setup-hooks

# Remove git hooks
just remove-hooks
```

### Utilities

```bash
# Validate project structure
just validate

# Check for outdated dependencies
just deps-check

# Update dependencies
just deps-update

# Security audit
just audit

# Create project backup
just backup

# Clean everything (including node_modules)
just clean-all
```

## Command Categories

### 🔨 Build & Development

- `install` - Install dependencies
- `build` - Build TypeScript
- `build-watch` - Build in watch mode
- `clean` - Remove build artifacts
- `rebuild` - Clean and build
- `dev` - Full development cycle
- `watch` - Watch mode alias

### 🧪 Testing

- `test` - Run all tests
- `quick-test` - Fast SQLite test
- `test-*` - Run specific test suite
- `test-file FILE` - Run custom test
- `test-watch` - Watch and test

### ✅ Quality

- `typecheck` - Type checking
- `lint` - Run linter
- `lint-fix` - Fix lint issues
- `format` - Format code
- `format-check` - Check formatting
- `check` - All quality checks
- `fix` - Auto-fix everything
- `pre-commit` - Pre-commit checks
- `validate` - Validate structure

### 🚀 Examples

- `example-sqlite` - SQLite example
- `example-multi-adapter` - Multi-adapter
- `example-associations` - Associations
- `example-validations` - Validations
- `example-callbacks` - Callbacks
- `example-migrations` - Migrations
- `examples` - Run all examples

### 🗄️ Database

- `init-sqlite` - Create SQLite DB
- `db-setup` - Setup PostgreSQL
- `clean-db` - Remove DB files

### 📚 Documentation

- `info` - Project information
- `stats` - Code statistics
- `docs` - List documentation
- `help-*` - Topic-specific help

### 🔄 CI/CD

- `ci` - Full CI pipeline
- `pre-release` - Release preparation
- `release` - Create release

### 🛠️ Utilities

- `deps-check` - Check outdated deps
- `deps-update` - Update deps
- `audit` - Security audit
- `backup` - Backup project
- `setup-hooks` - Install git hooks
- `remove-hooks` - Remove git hooks
- `clean-all` - Nuclear clean

## Recommended Workflows

### Daily Development

```bash
# Morning: fresh start
just fresh

# During development
just build-watch  # In one terminal
just test-watch   # In another terminal (optional)

# Before commit
just pre-commit
```

### Testing New Features

```bash
# Quick iteration
just quick-test

# Full test suite
just test

# With quality checks
just check test
```

### Before Pushing

```bash
# Complete verification
just ci
```

### Creating a Release

```bash
# Full release preparation
just pre-release

# Create release
just release
```

### Troubleshooting

```bash
# Nuclear option: start fresh
just clean-all
just fresh

# Validate everything is correct
just validate
just check
```

## Tips & Tricks

### Running Multiple Commands

```bash
# Chain commands with &&
just clean && just build && just test

# Or use recipes that do it for you
just dev        # clean + build + test
just pre-commit # check + test
just ci         # install + check + build + test
```

### Custom Test Files

```bash
# Run any test file
just test-file test-custom.ts
just test-file examples/my-example.ts
```

### Getting Help

```bash
# List all commands with descriptions
just --list

# Show the Justfile
cat Justfile

# Show a specific recipe
just --show test
```

### Environment Variables

Just supports environment variables:

```bash
# Use in commands
NODE_ENV=production just build

# Or set in Justfile
# export NODE_ENV := "production"
```

### Parallel Execution

Some commands can be run in parallel for efficiency:

```bash
# Run in separate terminals
just build-watch    # Terminal 1
just test-watch     # Terminal 2
```

## Comparison with npm scripts

| Task           | npm/bun                          | Just                   |
| -------------- | -------------------------------- | ---------------------- |
| List commands  | `npm run` (partial)              | `just --list` (full)   |
| Run command    | `npm run test`                   | `just test`            |
| Chaining       | `npm run clean && npm run build` | `just rebuild`         |
| Documentation  | Comments in package.json         | Built-in with `--list` |
| Cross-platform | ⚠️ Can be tricky                 | ✅ Consistent          |
| Dependencies   | ❌ Not supported                 | ✅ Built-in            |
| Parameters     | ⚠️ Complex                       | ✅ Simple              |

## Advanced Usage

### Creating New Commands

Add to Justfile:

```just
# Your custom command
my-command:
    @echo "Running my command..."
    bun run my-script.ts
```

### Commands with Parameters

```just
# Command with argument
test-specific NAME:
    @echo "Testing {{NAME}}..."
    bun run test-{{NAME}}.ts
```

Usage:

```bash
just test-specific model
just test-specific sqlite
```

### Conditional Commands

```just
# Different behavior based on conditions
deploy ENV:
    @if [ "{{ENV}}" = "production" ]; then \
        echo "Deploying to production..."; \
    else \
        echo "Deploying to {{ENV}}..."; \
    fi
```

## Integration with Other Tools

### VS Code

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Just: Test",
      "type": "shell",
      "command": "just test",
      "group": "test"
    },
    {
      "label": "Just: Build",
      "type": "shell",
      "command": "just build",
      "group": "build"
    }
  ]
}
```

### Git Hooks

```bash
# Install pre-commit hook
just setup-hooks

# Now just pre-commit runs automatically on commit
```

### CI/CD (GitHub Actions)

```yaml
- name: Install Just
  run: curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

- name: Run CI
  run: just ci
```

## Why Just?

1. **Better than Make**: Modern syntax, cross-platform
2. **Better than npm scripts**: Powerful features, clear documentation
3. **Simple**: Easy to learn and use
4. **Fast**: Native binary, no interpreter overhead
5. **Flexible**: Shell commands, parameters, dependencies
6. **Documented**: Built-in help with `--list`

## Resources

- [Just GitHub](https://github.com/casey/just)
- [Just Documentation](https://just.systems)
- [Justfile Syntax](https://github.com/casey/just#syntax)

## Common Issues

**Q: Command not found after installation**

```bash
# Add to PATH or use full path
/usr/local/bin/just --version
```

**Q: How to see what a command does?**

```bash
just --show command-name
```

**Q: Can I use Just without installing it?**

```bash
# Run with Docker
docker run --rm -v $PWD:/work just/just --list
```

**Q: How to debug a recipe?**

```bash
# Add set -x to see commands
recipe:
    #!/bin/bash
    set -x
    # commands here
```

---

Happy commanding! 🚀
