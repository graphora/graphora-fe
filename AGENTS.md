# Repository Guidelines

## Project Structure & Module Organization
Graphora's Next.js 15 frontend lives in `app/`. Application code sits in `app/src` with the App Router under `app/src/app` (route handlers in `app/api`), reusable UI in `app/src/components`, hooks in `app/src/hooks`, shared utilities in `app/src/lib`, and cross-cutting providers in `app/src/providers`. Sample ingest assets reside in `app/data`, while static files belong in `app/public`. Start new TypeScript types in `app/src/types`.

## Build, Test, and Development Commands
Run all commands from `app/`. `npm install` (or `npm ci`) bootstraps dependencies. `npm run dev` launches the Next dev server with Turbopack at http://localhost:3000. `npm run build` produces a production bundle and verifies type safety. `npm run start` serves the built app. `npm run lint` runs ESLint with the `next/core-web-vitals` rules; `npm run test` executes the Vitest suite, and `npm run format` applies Prettier.

## Coding Style & Naming Conventions
We code in TypeScript with React Server Components where practical. Keep files in kebab-case (`chunking-panel.tsx`), components in PascalCase, hooks prefixed with `use`, and Zustand stores suffixed with `Store`. Follow the project’s 2-space indentation and omit semicolons to match existing files. Prefer Tailwind utility classes plus Shadcn UI components. Run `npm run format` (Prettier) and `npm run lint -- --fix` before pushing; add lightweight comments only when intent is non-obvious.

## Testing Guidelines
Vitest is configured with JSDOM; place component or store specs under `__tests__/` beside the feature or as `*.test.ts(x)` files. The initial smoke coverage exercises the graph editor store—extend it when adding behaviour. Pair `npm run test` with screenshots or short clips for UI flows that still require manual validation.

## Commit & Pull Request Guidelines
Write imperative, concise commit subjects (`Add chunking inspector panel`) and let longer context live in the body. Every PR must describe the change, note deployment or Clerk/Neo4j impacts, and attach before/after visuals for UI updates. Link Jira/GitHub issues with `Closes #123`. Mark checkboxes for linting/manual verification, and request review from code owners covering the touched domains.

## Security & Configuration Tips
Copy `app/env-sample` to `.env.local` and fill Clerk keys plus backend URLs (`BACKEND_API_URL` for server routes, `NEXT_PUBLIC_BACKEND_API_URL` for client calls); never commit secrets. Keep API calls within `app/src/app/api/` so server-side code can access environment variables safely. When testing locally, stub third-party endpoints rather than hardcoding credentials.
