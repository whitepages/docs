<p align="center">
  <img src="https://i.imgur.com/SoSJ7ye.png" alt="Whitepages" width="300" />
</p>

<h3 align="center">Whitepages Pro API Documentation</h3>

<p align="center">
  Official documentation for the Whitepages Pro API.<br />
  <a href="https://api.whitepages.com/docs">View Documentation</a>
</p>

<p align="center">
  <a href="https://god.gw.postman.com/run-collection/38340398-c9c1d404-1b4d-4465-9201-1286f9f890fe?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D38340398-c9c1d404-1b4d-4465-9201-1286f9f890fe%26entityType%3Dcollection%26workspaceId%3Dd72854a7-b64f-444d-b8c7-12d52e990360"><img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;"></a>
</p>

---

## About the Whitepages Pro API

The Whitepages Pro API is a U.S. people and property data API. It returns phone
numbers, email addresses, current and historical addresses, property ownership,
and residents. The data comes from public and legal records.

Coverage is United States only, and coverage varies by record. The API is not an
FCRA-regulated product and is not intended for credit, underwriting, employment,
housing, or insurance decisions. See the [Terms of Service](https://www.whitepages.com/terms)
for full details, or contact [api@whitepages.com](mailto:api@whitepages.com) with questions.

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
