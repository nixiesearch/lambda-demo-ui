# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React + TypeScript demo application showcasing Nixiesearch hybrid search capabilities for Wikipedia articles. The app uses RRF (Reciprocal Rank Fusion) to combine lexical (BM25) and semantic (vector) search.

## Prerequisites

- **Nixiesearch Backend**: Must be running on `http://localhost:8080` (configurable via environment variable)
- **Wikipedia Index**: Named `wiki` with schema:
  - `_id`: ID field
  - `title`: Text field with `suggest: true` enabled
  - `content`: Text field with semantic search enabled

## Environment Configuration

The application uses environment variables to configure the API backend:

- **VITE_API_BASE_URL**: Base URL for Nixiesearch API (default: `http://localhost:8080`)
- Copy `.env.example` to `.env` and customize if needed
- In development, an empty value uses the Vite proxy to `localhost:8080`
- In production, this should point to your hosted Nixiesearch instance

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Architecture

### Single-Component Design

The entire application logic resides in **src/App.tsx** (~450 lines). This intentional design keeps the codebase simple for backend engineers to modify.

### Key Architectural Decisions

1. **No Complex State Management**: Uses React `useState` hooks exclusively
2. **Plain Fetch API**: No HTTP client libraries (axios, etc.)
3. **Inline API Functions**: `fetchSuggestions()` and `fetchSearchResults()` are defined at the top of App.tsx
4. **Extensive Console Logging**: Every state change and API call is logged with `[State]`, `[API Request]`, `[API Response]`, and `[User Action]` prefixes

### Vite Proxy Configuration

The dev server (vite.config.ts:13-19) proxies `/v1/*` requests to `http://localhost:8080/v1/*`. This means:
- Frontend calls: `fetch('/v1/index/wiki/search')`
- Proxied to: `http://localhost:8080/v1/index/wiki/search`

## Nixiesearch API Integration

### Autocomplete Endpoint

**POST** `/v1/index/wiki/suggest`

Request payload (App.tsx:32-36):
```json
{
  "query": "search term",
  "fields": ["title"],
  "count": 10
}
```

Response: `{ suggestions: [{text: string, score: number}], took: number }`

### Search Endpoint (RRF Hybrid)

**POST** `/v1/index/wiki/search`

Request payload (App.tsx:84-105):
```json
{
  "query": {
    "rrf": {
      "retrieve": [
        {
          "multi_match": {
            "query": "search term",
            "fields": ["title", "content"]
          }
        },
        {
          "semantic": {
            "field": "content",
            "query": "search term"
          }
        }
      ]
    }
  },
  "fields": ["_id", "title", "content"],
  "size": 10
}
```

Response: `{ hits: [{_id, title, content, _score}], took: number }`

**Search Strategy**: RRF combines two retrieval methods:
1. **Lexical**: Multi-field BM25 matching on `title` and `content`
2. **Semantic**: Vector similarity on `content` embeddings

### Modifying Search Behavior

- **Change lexical fields**: Edit `fields: ["title", "content"]` in App.tsx:91
- **Change semantic field**: Edit `field: 'content'` in App.tsx:96
- **Change result count**: Edit `size: 10` in App.tsx:104
- **Change text truncation**: Edit `maxLength: 500` in App.tsx:322
- **Change autocomplete debounce**: Edit `150ms` in App.tsx:209

## UI Components

Uses **shadcn/ui** components (Tailwind CSS + Radix UI):
- `src/components/ui/input.tsx`: Search input
- `src/components/ui/card.tsx`: Result cards
- `src/components/ui/badge.tsx`: Score badges

Import alias: `@/` maps to `src/` (configured in vite.config.ts:8-12)

## State Management

Key state variables in App.tsx:165-174:
- `query`: Current search input
- `suggestions`: Autocomplete suggestions array
- `results`: Search results array
- `loading`: Search in progress
- `showSuggestions`: Show/hide autocomplete dropdown
- `selectedSuggestionIndex`: Keyboard navigation index
- `searchStats`: `{took: number, count: number}` for display
- `error`: Error message string
- `debounceTimer`: Ref for autocomplete debouncing
- `searchPerformed`: Ref to prevent suggestions after search

## Debouncing Logic

Autocomplete suggestions (App.tsx:177-216):
- Debounce delay: 150ms
- Skips fetching if `searchPerformed.current` is true (prevents suggestions from appearing after search execution)
- Reset on every `query` change

## Search Flow

1. User types → `handleInputChange()` → sets `query`, resets `searchPerformed`
2. After 150ms → fetches suggestions → shows dropdown
3. User presses Enter OR clicks suggestion → `performSearch()` → sets `searchPerformed = true`, hides suggestions, fetches results

## Keyboard Navigation

- **Arrow Down/Up**: Navigate suggestions (App.tsx:278-295)
- **Enter**: Select highlighted suggestion OR trigger search (App.tsx:296-303)
- **Escape**: Hide suggestions (App.tsx:304-308)

## Styling

- **Tailwind CSS**: Utility-first styling
- **CSS Variables**: Defined in `src/index.css` for shadcn/ui theming
- **Gradient Background**: `bg-gradient-to-br from-blue-50 via-white to-purple-50` (App.tsx:328)
- **Result Cards**: Left blue border (`border-l-4 border-l-blue-500`)

## TypeScript Configuration

- **tsconfig.json**: Base config that extends app and node configs
- **tsconfig.app.json**: App-specific settings
- **tsconfig.node.json**: Node/Vite config settings

## Linting

- **ESLint 9**: Uses flat config format (eslint.config.js)
- **TypeScript ESLint**: Type-aware linting
- **React Hooks**: Enforces hooks rules
- **React Refresh**: Fast Refresh compatibility checks

## GitHub Pages Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to GitHub Pages on push to `master`:

- **Node.js version**: 20 (required by Vite 7.2.2)
- **Build configuration**: Uses `/lambda-demo-ui/` as base path (configured in vite.config.ts)
- **API URL**: Set via `VITE_API_BASE_URL` environment variable in workflow
- **Enable Pages**: Go to Settings → Pages → Source: "GitHub Actions"

**Note**: For production deployments, update `VITE_API_BASE_URL` in the workflow to point to your hosted Nixiesearch instance. The current configuration uses `localhost:8080` which won't work from remote browsers due to CORS restrictions.

## Troubleshooting

**No autocomplete suggestions**: Verify `title` field has `suggest: true` in Nixiesearch index schema

**Search fails**: Check Nixiesearch is running on port 8080 and `wiki` index exists

**API calls fail on GitHub Pages**: Ensure `VITE_API_BASE_URL` points to an accessible Nixiesearch instance with CORS enabled for your domain

**Console logging**: All API calls and state changes are logged with categorized prefixes for debugging
