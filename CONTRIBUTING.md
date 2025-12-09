# Contributing

Thank you for your interest in contributing to the Whitepages API Documentation!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies with `bun install`
4. Start the development server with `bun run dev`

## Code Style

### General Guidelines

- **Don't abbreviate names** - Use descriptive names (e.g., `navigation` instead of `nav`)
- **Avoid comments** - If code needs a comment to be understood, refactor it to be more readable instead
- **Use Bun** - This project uses Bun as the JavaScript runtime

### Formatting

This project uses Prettier for code formatting. Run the formatter before committing:

```bash
bun run format
```

### Linting

ESLint is configured with Next.js recommended rules:

```bash
bun run lint
```

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/). All commits must follow this format:

```
<type>: <description>
```

### Types

| Type       | Description                                  |
| ---------- | -------------------------------------------- |
| `feat`     | New feature                                  |
| `fix`      | Bug fix                                      |
| `docs`     | Documentation changes                        |
| `style`    | Formatting, missing semicolons, etc.         |
| `refactor` | Code restructuring without changing behavior |
| `perf`     | Performance improvements                     |
| `test`     | Adding or updating tests                     |
| `chore`    | Build process, dependencies, tooling         |

### Examples

```
feat: add authentication page to API reference
fix: correct broken link in getting started guide
docs: update README with new setup instructions
refactor: extract card component from routes page
```

### Rules

- Use imperative mood ("add" not "added")
- Keep the first line under 72 characters
- Make atomic commits (single purpose)
- Split unrelated changes into separate commits

Commits are validated by commitlint via Husky pre-commit hooks.

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass (`bun run lint`, `bun run build`)
4. Submit a pull request with a clear description

## Documentation Changes

### Adding New Pages

1. Create a new `.mdx` file in the appropriate directory under `content/docs/`
2. Add frontmatter with `title`, `description`, and optionally `icon`
3. Update the corresponding `meta.json` to include the new page

### Updating API Reference

The API reference is auto-generated from the OpenAPI spec. To regenerate:

```bash
bun run generate:openapi
```

Do not manually edit files in `content/docs/references/person/`, `content/docs/references/property/`, or `content/docs/references/account/` as they will be overwritten.

## Questions?

If you have questions, please open an issue for discussion.
