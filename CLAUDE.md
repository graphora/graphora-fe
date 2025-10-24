# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Working Directory**: `app/`

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Vitest suite (see vitest.setup.ts)
npm run format       # Format sources with Prettier

# Development server runs on http://localhost:3000
```

## Architecture Overview

Graphora is a knowledge graph platform that transforms unstructured data into structured graphs using AI. The application follows a multi-step workflow: Setup → Design → Transform → Merge → Analyze.

### Core Architecture Patterns

**State Management**: Multiple Zustand stores with domain separation
- `ontology-store.ts` - Entity/relationship management with YAML conversion
- `graph-editor-store.ts` - Visual graph editing with Immer for immutable updates
- `ontology-editor-store.ts` - Form-based ontology editing

**API Integration**: Proxy-based architecture
- Frontend API routes (`/src/app/api/`) proxy to backend services
- Backend URL configured via `BACKEND_API_URL` environment variable
- Authentication via Clerk with user-id headers
- 30-second timeouts with AbortController for error handling

**Authentication**: Clerk integration
- Middleware protects all routes except sign-in/sign-up
- User context available via `useUser()` hook throughout app

### Key Technical Decisions

**Hybrid Editing**: Both visual graph editor (ReactFlow/Neo4j NVL) and YAML text editor
**Conflict Resolution**: Built-in merge conflict handling for graph operations
**Type Safety**: Full TypeScript with Zod validation
**UI Foundation**: Shadcn/UI components with Radix primitives

## File Structure Patterns

**API Routes**: `/src/app/api/[feature]/route.ts` - Proxy to backend with auth
**Pages**: `/src/app/[feature]/page.tsx` - Feature-specific pages
**Components**: Organized by feature in `/src/components/[feature]/`
**State**: Domain-specific Zustand stores in `/src/lib/store/`
**Types**: TypeScript definitions in `/src/types/` and `/src/lib/types/`

## Domain Applications

The app supports domain-specific workflows:
- **Financial**: Form 10K processing, regulatory documents
- **Generic**: Flexible ontology-driven data modeling

## Environment Configuration

**Required Environment Variables**:
- `BACKEND_API_URL` - Backend service URL (defaults to localhost:8000)
- Clerk authentication keys
- Database configuration per user

**Next.js Configuration**: Custom webpack config for Neo4j NVL and graph libraries, proxy rewrites to backend API

## Development Notes

**Graph Visualizations**: Uses Neo4j NVL, ReactFlow, D3.js, and ECharts
**Real-time Features**: Socket.io integration for collaborative editing
**Theming**: Dark/light mode support with next-themes
**Responsive Design**: Tailwind CSS with shadcn/ui components
