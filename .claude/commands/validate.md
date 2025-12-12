# Claude Command: Validate

Runs deployment validation checks locally before pushing.

## Usage

```
/validate
```

## Process

Run all validation checks in sequence, stopping on first failure:

1. `bun run format:check` - Check code formatting with Prettier
2. `bun run lint` - Run ESLint checks
3. `bun run types:check` - Run TypeScript type checking

## Output

- Report pass/fail status for each check
- On failure, show the error output and suggest fix commands
- On success, confirm all checks passed

## Fix Commands

If checks fail, suggest:
- Formatting: `bun run format:write`
- Lint: Review errors and fix manually
- Types: Review type errors and fix manually
