<p align="center">
  <img src="https://i.imgur.com/SoSJ7ye.png" alt="Whitepages" width="300" />
</p>

<h3 align="center">API Documentation</h3>

<p align="center">
  Official documentation for the Whitepages API<br />
  <a href="https://api.whitepages.com/docs">View Documentation</a>
</p>

---

## Development

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+

### Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the documentation.

### Generate API Reference

The API reference documentation is auto-generated from the OpenAPI spec:

```bash
bun run generate:openapi
```

This fetches the latest spec from `https://api.whitepages.com/openapi.json` and generates the MDX files.

## Project Structure

```
├── content/docs/
│   ├── documentation/     # Getting Started & Guides
│   └── references/        # API Reference & SDK docs
├── scripts/generators/    # OpenAPI doc generation
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   └── lib/              # Utilities and configs
└── public/               # Static assets
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on code style, commit conventions, and how to submit changes.

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [Fumadocs](https://fumadocs.dev/) - Documentation framework
- [fumadocs-openapi](https://fumadocs.dev/docs/ui/openapi) - OpenAPI documentation generator
