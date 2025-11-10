# Wikipedia Search Demo

A modern search interface for Wikipedia articles powered by Nixiesearch hybrid search.

## Features

- **Hybrid Search**: RRF-based combination of lexical (multi_match) and semantic (vector) search
- **Autocomplete**: Real-time search suggestions based on article titles
- **Keyboard Navigation**: Navigate suggestions with arrow keys
- **Modern UI**: Clean, gradient design with shadcn/ui components
- **Search Stats**: Display query time and result count
- **Loading States**: Visual feedback during search operations

## Prerequisites

- Node.js 18+ installed
- Nixiesearch running on `http://localhost:8080`
- Wikipedia index named `wiki` with the following schema:
  - `_id`: ID field
  - `title`: Text field with suggest enabled
  - `content`: Text field with semantic search enabled

## Installation

```bash
cd demo
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

The Vite dev server is configured with a proxy that forwards `/v1/*` requests to `http://localhost:8080/v1/*`.

## Build

Create a production build:

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Architecture

### Simple Single-Component Design

The entire application logic is contained in a single `App.tsx` file (~270 lines) for easy maintenance by backend engineers:

- **State Management**: Simple `useState` hooks for query, suggestions, results, loading states
- **API Calls**: Plain `fetch()` functions (no complex HTTP clients)
- **Debouncing**: Basic `setTimeout` for autocomplete
- **UI Components**: shadcn/ui components (Input, Card, Badge)

### API Endpoints

**Autocomplete**: `POST /v1/index/wiki/suggest`
```json
{
  "query": "search term",
  "fields": ["title"],
  "count": 10
}
```

**Search**: `POST /v1/index/wiki/search` (RRF Hybrid)
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

The search uses **RRF (Reciprocal Rank Fusion)** to combine:
- **Lexical search**: Multi-field BM25 matching on title and content
- **Semantic search**: Vector similarity search on content embeddings

## Customization

- **Lexical fields**: Modify `fields: ["title", "content"]` in the multi_match query
- **Semantic field**: Change `field: 'content'` in the semantic query
- **Result count**: Modify `size: 10` to change number of results
- **Text truncation**: Adjust `maxLength: 500` in `truncateText()` function
- **Debounce delay**: Change `150ms` in the suggestions `useEffect`
- **Colors**: Update gradient colors in `App.tsx` (lines 155, 159)

## File Structure

```
demo/
├── src/
│   ├── App.tsx              # Main application logic (single file)
│   ├── main.tsx             # React entry point
│   ├── index.css            # Tailwind + shadcn/ui styles
│   ├── lib/
│   │   └── utils.ts         # cn() utility function
│   └── components/ui/       # shadcn/ui components
│       ├── input.tsx
│       ├── card.tsx
│       └── badge.tsx
├── vite.config.ts           # Vite config with proxy
├── tailwind.config.js       # Tailwind CSS config
└── package.json
```

## Troubleshooting

**"Search failed" error**:
- Ensure Nixiesearch is running on `http://localhost:8080`
- Check that the `wiki` index exists
- Verify the index schema matches the expected fields

**No autocomplete suggestions**:
- Ensure the `title` field has `suggest: true` in the index schema
- Check browser console for API errors

**Build errors**:
- Run `npm install` to ensure all dependencies are installed
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
