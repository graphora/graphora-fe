# Graphora Frontend

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-15.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> Transform unstructured data into powerful knowledge graphs with AI

Graphora is a knowledge graph platform that transforms unstructured data into structured graphs using AI. This repository contains the Next.js frontend application that provides the user interface for the complete knowledge graph workflow.

## Features

- **Multi-step Workflow**: Setup → Design → Transform → Merge → Analyze
- **Hybrid Editing**: Visual graph editor (ReactFlow/Neo4j NVL) and YAML text editor
- **Real-time Collaboration**: Socket.io integration for collaborative editing
- **Rich Visualizations**: Neo4j NVL, ReactFlow, D3.js, and ECharts
- **Conflict Resolution**: Built-in merge conflict handling for graph operations
- **Domain Applications**: Healthcare, Financial, and Generic ontology-driven workflows
- **Dark/Light Mode**: Full theming support
- **Type-Safe**: Full TypeScript with Zod validation

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see [graphora-api](https://github.com/graphora/graphora-api))

### Installation

```bash
# Clone the repository
git clone https://github.com/graphora/graphora-fe.git
cd graphora-fe

# Install dependencies
cd app
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Development

### Commands

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Vitest unit tests (Graph editor smoke coverage)
npm run format       # Format source files with Prettier
```

### Release & Versioning

- The sidebar now renders the current build number from `process.env.NEXT_PUBLIC_APP_VERSION`.
- `next.config.ts` automatically sets that env var by trying, in order:
  1. Any value you export manually (helpful for preview builds)
  2. The latest reachable Git tag (`git describe --tags --abbrev=0`)
  3. The fallback from `app/package.json` (`version` field)
- To cut a release and update the on-screen version:
  1. Run `cd app && npm version <major|minor|patch>` to bump `package.json` and create a tag
  2. Push both the commit and tag: `git push && git push --tags`
  3. Create the GitHub release from that tag (optional but recommended)
- Local overrides are simple: `NEXT_PUBLIC_APP_VERSION=dev npm run dev` will display "Version dev".

### Project Structure

```
app/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/         # API routes (proxy to backend)
│   │   └── [feature]/   # Feature pages
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── [feature]/   # Feature-specific components
│   ├── lib/             # Utilities and helpers
│   │   ├── store/       # Zustand state management
│   │   └── types/       # TypeScript types
│   └── types/           # Global type definitions
```

### Key Technologies

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand with Immer
- **Authentication**: Clerk
- **Graph Visualization**: Neo4j NVL, ReactFlow, D3.js, ECharts
- **Forms**: React Hook Form + Zod
- **Real-time**: Socket.io

## Architecture

### State Management

Multiple Zustand stores with domain separation:
- `ontology-store.ts` - Entity/relationship management with YAML conversion
- `graph-editor-store.ts` - Visual graph editing with Immer
- `ontology-editor-store.ts` - Form-based ontology editing

### API Integration

Proxy-based architecture:
- Frontend API routes (`/src/app/api/`) proxy to backend services
- Backend URL configured via `BACKEND_API_URL` environment variable
- Authentication via Clerk with user-id headers
- 30-second timeouts with AbortController

## Configuration

Create a `.env.local` file in the `app/` directory:

```bash
# Backend API
BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
```

See `.env.example` for all available options.

## Sample Data

The example documents in `app/data/` and `app/public/samples/` come from publicly available SEC Form 10-K filings. They are included for demonstration only and may be replaced with your own content before redistribution. Remove any proprietary materials prior to publishing custom builds.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Before Contributing

1. Read the [Code of Conduct](CODE_OF_CONDUCT.md)
2. Sign the [Contributor License Agreement](CLA.md)
3. Check out [good first issues](https://github.com/graphora/graphora-fe/labels/good%20first%20issue)

## Documentation

- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Security Policy](SECURITY.md) - How to report security issues
- [Support](SUPPORT.md) - How to get help
- [Trademark Policy](TRADEMARK.md) - Trademark usage guidelines

## Related Repositories

- **Backend API**: [graphora/graphora-api](https://github.com/graphora/graphora-api)
- **Python Client**: [graphora/graphora-client](https://github.com/graphora/graphora-client)

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

- ✅ Use for free under AGPL v3 terms
- ✅ Modify and distribute with source code
- ❌ Cannot use as closed-source SaaS without commercial license

For commercial licensing (closed-source SaaS, enterprise deployments, OEM), contact: **sales@graphora.io**

See [LICENSE](LICENSE) for full terms.

## Commercial Support

- **Enterprise Support**: SLA-backed support for production deployments
- **Consulting**: Custom integrations, training, architecture design
- **Commercial Licensing**: Closed-source and SaaS deployments

Contact: **support@graphora.io**

## Community

- **GitHub Discussions**: [Ask questions, share ideas](https://github.com/graphora/graphora-fe/discussions)
- **Discord**: Coming soon
- **Twitter**: Coming soon

## Security

Please report security vulnerabilities to **support@graphora.io**

See [SECURITY.md](SECURITY.md) for details.

## Roadmap

- [ ] Multi-language support
- [ ] Advanced graph analytics
- [ ] Plugin system
- [ ] Offline mode
- [ ] Mobile app

## Acknowledgments

Built with these amazing open source projects:
- [Next.js](https://nextjs.org/)
- [Neo4j](https://neo4j.com/)
- [ReactFlow](https://reactflow.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Clerk](https://clerk.com/)

---

Made with ❤️ by [Arivan Labs](https://arivanlabs.com)
