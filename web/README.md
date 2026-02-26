# ocNewsBot - Frontend

React TypeScript frontend for managing RSS news sources.

## Tech Stack

- **Framework**: React 18 with TypeScript (strict mode)
- **Build Tool**: Vite 7
- **Routing**: React Router DOM
- **State Management**: TanStack Query (React Query) v5
- **Forms**: React Hook Form + Zod validation
- **Styling**: TailwindCSS v4 with PostCSS
- **API Client**: Fetch-based with automatic JWT handling

## Prerequisites

- Node.js 18+ and npm
- Backend server running on `http://localhost:3001`

## Environment Setup

Create `.env` file (or copy from `.env.example`):

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

Build for production:

```bash
npm run build
```

Output will be in `dist/` directory.

## Features

### Authentication
- JWT-based authentication
- Auto token refresh on page load
- Protected routes with automatic redirect
- Login page with form validation
- Secure logout with token cleanup

### Source Management
- View all RSS sources in a responsive table
- Real-time search by name, URL, or topic tags
- Create new sources with comprehensive form
- Edit existing sources with pre-filled modal
- Delete sources with confirmation dialog
- Toggle enabled/disabled status with one click
- Validate RSS feeds before saving
- Display source metadata (language, trust score, tags, validation status)

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── ProtectedRoute.tsx
│   └── SourceFormModal.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── lib/               # Utilities and services
│   └── api-client.ts
├── pages/             # Page components
│   ├── LoginPage.tsx
│   └── SourcesPage.tsx
├── types/             # TypeScript type definitions
│   └── api.ts
├── App.tsx            # Root component with routing
├── main.tsx           # Application entry point
└── index.css          # Global styles with Tailwind
```

## API Integration

The frontend communicates with the backend API at `http://localhost:3001/api`:

- `POST /auth/login` - User authentication
- `GET /auth/me` - Get current user
- `GET /sources` - List all sources
- `POST /sources` - Create source
- `PATCH /sources/:id` - Update source
- `DELETE /sources/:id` - Delete source
- `POST /sources/validate` - Validate RSS URL

## Type Safety

All API types are strictly typed and match the backend schema:
- `Source` - RSS source entity
- `SourceLang` - Language enum (VI | EN | MIXED)
- `ValidationStatus` - RSS validation status (OK | FAILED)
- `LoginInput` / `LoginResponse` - Auth types
- `ApiError` / `ApiErrorResponse` - Error handling types

## Development Notes

- TypeScript strict mode enabled
- ESLint and type checking via `npm run build`
- Uses `verbatimModuleSyntax` for clean imports
- TailwindCSS v4 with CSS-based configuration
- Token stored in localStorage
- 401 responses trigger automatic logout
- React Query for server state management with automatic cache invalidation
- Form validation matches backend Zod schemas exactly
- Optimistic UI updates for better UX

## Future Enhancements

- Sorting by columns (name, trust score, date)
- Pagination for large source lists
- Bulk operations (enable/disable multiple sources)
- Source analytics and statistics
- Export sources to JSON/CSV
- Import sources from file
- Advanced filters (by language, trust score range, validation status)
- Source health monitoring dashboard
