# Frontend

React PWA for Claude Dev Container. Mobile-first interface for managing projects and executions.

## Key Files

- `src/App.tsx` - Root component and routing
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/api/` - Backend API client

## Structure

```
frontend/
├── src/
│   ├── App.tsx           # Root component
│   ├── components/
│   │   ├── ProjectList/  # Project selection
│   │   ├── BeadList/     # Bead listing
│   │   ├── ExecutionView/ # Execution status
│   │   └── ActionButtons/ # Work/Review/Push
│   ├── hooks/
│   │   ├── useProjects.ts
│   │   ├── useBeads.ts
│   │   └── useExecution.ts
│   ├── api/
│   │   ├── projects.ts
│   │   ├── beads.ts
│   │   └── executions.ts
│   └── types/
│       ├── project.ts
│       ├── bead.ts
│       └── execution.ts
├── public/
│   └── manifest.json     # PWA manifest
└── tests/
    └── *.test.tsx        # Component tests
```

## Dependencies

- **Depends on:** Backend API
- **Depended by:** None (end-user interface)

## Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- src/components/ProjectList/ProjectList.test.tsx
```

## Development

```bash
# Setup
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Type check
npm run typecheck
```

## Component Patterns

### State Management
- Local state with `useState` for component-specific state
- Custom hooks for data fetching and shared logic
- Props drilling for parent-child communication

### Error Handling
All components should handle:
- Loading states
- Error states with retry
- Empty states

### Testing
Each component should test:
- Initial loading state
- Successful data render
- Error state and retry
- User interactions
- Empty state
