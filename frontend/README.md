# Frontend

React PWA for Claude Dev Container. Mobile-first interface for managing projects and executions.

## Key Files

- `src/App.tsx` - Root component
- `src/api.ts` - Backend API client
- `src/types.ts` - TypeScript type definitions
- `src/components/` - React components

## Structure

```
frontend/
├── src/
│   ├── App.tsx           # Root component
│   ├── main.tsx          # React entry point
│   ├── api.ts            # Backend API client
│   ├── types.ts          # TypeScript types
│   ├── index.css         # Global styles (Tailwind)
│   └── components/       # React components
├── tests/
│   ├── setup.ts          # Test setup
│   └── mocks/            # MSW mock handlers
│       ├── handlers.ts
│       └── server.ts
├── index.html            # HTML entry point
├── vite.config.ts        # Vite bundler config
├── vitest.config.ts      # Test runner config
└── tailwind.config.js    # Tailwind CSS config
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
```

## Development

```bash
# Setup
cd frontend
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit
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
