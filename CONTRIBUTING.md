# Contributing to Graphora Frontend

Thank you for your interest in contributing to Graphora! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Contributor License Agreement](#contributor-license-agreement)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Ways to Contribute

- **Bug Reports**: File detailed bug reports with reproduction steps
- **Feature Requests**: Propose new features with clear use cases
- **Code Contributions**: Fix bugs, implement features, improve performance
- **Documentation**: Improve README, add examples, write tutorials
- **Testing**: Write tests, improve test coverage
- **Design**: UI/UX improvements, accessibility enhancements

## Development Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/graphora-fe.git
   cd graphora-fe
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/graphora/graphora-fe.git
   ```

4. **Install dependencies**
   ```bash
   cd app
   npm install
   ```

5. **Set up environment variables**
   ```bash
   # Copy .env.example to .env.local
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

The app will be available at http://localhost:3000

## Making Changes

### Branch Naming Convention

Use descriptive branch names:
- `feature/your-feature-name` - For new features
- `fix/bug-description` - For bug fixes
- `docs/what-you-are-documenting` - For documentation
- `refactor/what-you-are-refactoring` - For code refactoring
- `test/what-you-are-testing` - For adding tests

Example:
```bash
git checkout -b feature/graph-export-json
```

### Commit Messages

Write clear, concise commit messages:
- Use present tense ("Add feature" not "Added feature")
- First line should be 50 characters or less
- Reference issues and PRs when applicable

Example:
```
Add JSON export for knowledge graphs

- Implement export functionality in graph service
- Add export button to graph editor UI
- Include tests for export validation

Fixes #123
```

## Pull Request Process

1. **Ensure your code builds**
   ```bash
   npm run build
   ```

2. **Run linting**
   ```bash
   npm run lint
   ```

3. **Run tests (if applicable)**
   ```bash
   npm test
   ```

4. **Update documentation**
   - Update README if you changed functionality
   - Add JSDoc comments to new functions
   - Update CHANGELOG.md (if exists)

5. **Create Pull Request**
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues
   - Add screenshots for UI changes
   - Mark as draft if work is in progress

6. **Sign the CLA**
   - All contributors must sign the [Contributor License Agreement](CLA.md)
   - Add this line to your PR description:
     ```
     I have read and agree to the Contributor License Agreement.
     ```

7. **Code Review**
   - Be responsive to feedback
   - Make requested changes promptly
   - Keep discussions respectful and constructive

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Follow existing code style

### React

- Use functional components and hooks
- Follow React best practices
- Keep components focused and small
- Use proper prop typing with TypeScript

### Styling

- Use Tailwind CSS for styling
- Follow existing design patterns
- Ensure responsive design (mobile, tablet, desktop)
- Test dark/light theme compatibility

### File Organization

```
app/src/
├── app/              # Next.js app router pages
├── components/       # Reusable React components
│   ├── ui/          # shadcn/ui components
│   └── [feature]/   # Feature-specific components
├── lib/             # Utilities and helpers
│   ├── store/       # Zustand state management
│   └── types/       # TypeScript types
└── types/           # Global type definitions
```

### Code Style

- Use ESLint configuration provided
- 2 spaces for indentation
- Use semicolons
- Single quotes for strings
- Trailing commas in objects/arrays

### Comments

- Write self-documenting code
- Add comments for complex logic
- Use JSDoc for functions and components
- Explain "why" not "what"

Example:
```typescript
/**
 * Merges duplicate nodes in the knowledge graph based on similarity score
 * @param nodes - Array of graph nodes
 * @param threshold - Similarity threshold (0-1)
 * @returns Merged node array
 */
function mergeNodes(nodes: Node[], threshold: number): Node[] {
  // Implementation
}
```

## Testing

### Writing Tests

- Write tests for new features
- Write tests for bug fixes
- Aim for meaningful test coverage
- Test edge cases and error conditions

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Project-Specific Guidelines

### State Management (Zustand)

- Keep stores focused on specific domains
- Use Immer for immutable updates
- Document store structure and actions

### API Integration

- All API calls go through `/src/app/api/` routes
- Use proper error handling
- Include loading states
- Handle timeouts appropriately

### Graph Visualizations

- Test with different graph sizes
- Ensure performance with large datasets
- Maintain consistency across visualization libraries

### Accessibility

- Use semantic HTML
- Include ARIA labels where needed
- Test keyboard navigation
- Ensure color contrast ratios

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: See [SECURITY.md](SECURITY.md)
- **General**: See [SUPPORT.md](SUPPORT.md)

## License

By contributing, you agree that your contributions will be licensed under the AGPL v3 License and that you have read and agreed to the [Contributor License Agreement](CLA.md).

---

**Thank you for contributing to Graphora!** 🎉
