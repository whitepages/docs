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

## Documentation assistant preview

The bubble is hidden by default. For controlled testing, set
`NEXT_PUBLIC_DOCS_ASSISTANT_ENABLED=true` and `NEXT_PUBLIC_DOCS_ASSISTANT_URL` at
build time, then add `?docChat=1` to a docs page URL (or `&docChat=1` if it already
has a query string). The card starts minimized; click the bubble to open Doc.
Missing or invalid preview configuration leaves the widget disabled. The gateway
URL must use HTTPS, or loopback HTTP for local development.

Only the exact value `1` enables the preview. Ordinary URLs mount no chat widget
and make no assistant catalog or turn requests. Removing the parameter hides the
widget and disconnects any active browser stream, but keeps the saved conversation
pointer for the next preview-enabled visit.
This is a preview visibility switch, not authentication. Setting the frontend flag
false and rebuilding removes the widget even with the parameter present; the
gateway has an independent disable switch.

The panel sends a canonical page ID/path and literal question, with available
Amplitude user/session IDs in separate metadata fields. It does not send the
browser-held API key, cookies, or page inputs. Missing analytics do not block
chat. Minimizing preserves the current conversation and lets an active response
continue. Enter sends; Shift+Enter inserts a newline. Starter questions send their
literal text when clicked.

The browser remembers one conversation ID in localStorage, scoped to the configured
gateway origin. It stores no transcript, API key, analytics or browser-flow ID.
On reload or a later preview-enabled visit, the gateway recalls the visible history
without generating another answer. Sending is disabled until restoration finishes;
transient errors offer retry without forgetting the ID. Unknown or expired IDs
reset to a fresh welcome. New conversation clears the local pointer, not server
history. Blocked storage leaves chat usable for the current page and shows a notice.

The ID is a bearer capability available to scripts on the docs origin; localStorage
is not an account or authentication boundary. Read-only recall does not renew
server retention. The initial conversation cannot be remembered until the gateway
returns its ID on completion. Recovery of an interrupted first response, multiple
conversations and browser-action restoration remain subsequent work.

`just validate` checks generation, types, formatting, tests, and dependency pins.
For a self-contained browser smoke against a local fixture of the assistant's
public API:

```sh
just e2e
```

Install Playwright Chromium first, or supply an installed browser executable as
the argument. The smoke checks the real documentation UI, streaming, recall,
preview controls and mobile layout without an account, API key or live data call.
It does not establish behavior of a deployed service or model quality.

Corpus version 4 adds canonical, root-relative `page_url` fields. The browser
identity catalog uses the same generator. Corpus consumers must support this
version before loading the new output; older strict parsers reject the field.

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
