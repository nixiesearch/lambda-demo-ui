import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

// Types
interface Suggestion {
  text: string
  score: number
}

interface SuggestResponse {
  suggestions: Suggestion[]
  took: number
}

interface SearchHit {
  _id: string
  title: string
  content: string
  _score: number
}

interface SearchResponse {
  hits: SearchHit[]
  took: number
}

// API Functions
async function fetchSuggestions(query: string): Promise<SuggestResponse> {
  const requestBody = {
    query,
    fields: ['title'],
    count: 10
  }

  console.log('[API Request] Suggest:', {
    url: '/v1/index/wiki/suggest',
    method: 'POST',
    body: requestBody,
    timestamp: new Date().toISOString()
  })

  const startTime = performance.now()

  try {
    const response = await fetch('/v1/index/wiki/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const endTime = performance.now()
    const responseTime = (endTime - startTime).toFixed(2)

    if (!response.ok) {
      console.error('[API Error] Suggest failed:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`
      })
      throw new Error('Suggest request failed')
    }

    const data = await response.json()

    console.log('[API Response] Suggest:', {
      suggestionsCount: data.suggestions.length,
      suggestions: data.suggestions.map((s: Suggestion) => s.text),
      took: data.took,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    })

    return data
  } catch (err) {
    console.error('[API Error] Suggest exception:', err)
    throw err
  }
}

async function fetchSearchResults(query: string): Promise<SearchResponse> {
  const requestBody = {
    query: {
      rrf: {
        retrieve: [
          {
            multi_match: {
              query,
              fields: ['title', 'content']
            }
          },
          {
            semantic: {
              field: 'content',
              query
            }
          }
        ]
      }
    },
    fields: ['_id', 'title', 'content'],
    size: 10
  }

  console.log('[API Request] Search (RRF Hybrid):', {
    url: '/v1/index/wiki/search',
    method: 'POST',
    queryType: 'RRF (lexical multi_match + semantic)',
    lexicalFields: ['title', 'content'],
    semanticField: 'content',
    body: requestBody,
    timestamp: new Date().toISOString()
  })

  const startTime = performance.now()

  try {
    const response = await fetch('/v1/index/wiki/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const endTime = performance.now()
    const responseTime = (endTime - startTime).toFixed(2)

    if (!response.ok) {
      console.error('[API Error] Search failed:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`
      })
      throw new Error('Search request failed')
    }

    const data = await response.json()

    console.log('[API Response] Search:', {
      hitCount: data.hits.length,
      titles: data.hits.slice(0, 3).map((h: SearchHit) => h.title),
      took: data.took,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    })

    // Log first hit structure to debug _score issue
    if (data.hits.length > 0) {
      console.log('[API Response] First hit keys:', Object.keys(data.hits[0]))
      console.log('[API Response] First hit full object:', JSON.stringify(data.hits[0], null, 2))
      console.log('[API Response] _score value:', data.hits[0]._score)
      console.log('[API Response] Full response structure:', JSON.stringify(data, null, 2))
    }

    return data
  } catch (err) {
    console.error('[API Error] Search exception:', err)
    throw err
  }
}

function App() {
  // State
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [searchStats, setSearchStats] = useState<{ took: number; count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const searchPerformed = useRef(false)

  // Debounced suggestions
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      console.log('[State] Debounce timer cleared')
    }

    if (query.trim().length === 0) {
      console.log('[State] Query empty, clearing suggestions')
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    console.log('[State] Debounce started for query:', query)

    debounceTimer.current = setTimeout(async () => {
      // Don't fetch suggestions if a search was just performed
      if (searchPerformed.current) {
        console.log('[State] Skipping suggestions - search was performed')
        return
      }

      console.log('[User Action] Fetching suggestions after debounce for:', query)
      try {
        const data = await fetchSuggestions(query)
        console.log('[State] Setting suggestions:', data.suggestions.length, 'items')
        setSuggestions(data.suggestions)
        console.log('[State] Showing suggestions dropdown')
        setShowSuggestions(true)
      } catch (err) {
        console.error('[API Error] Suggestion error:', err)
      }
    }, 150)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query])

  // Log when results change
  useEffect(() => {
    if (results.length > 0) {
      console.log('[State] Results rendered:', results.length, 'items')
      console.log('[State] Result titles:', results.map(r => r.title))
    }
  }, [results])

  // Search function
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      console.log('[User Action] Search ignored - empty query')
      return
    }

    console.log('[User Action] Performing search for:', searchQuery)
    console.log('[State] Setting loading = true')
    setLoading(true)
    console.log('[State] Clearing error state')
    setError(null)
    console.log('[State] Hiding suggestions dropdown')
    setShowSuggestions(false)
    console.log('[State] Clearing suggestions array')
    setSuggestions([])
    console.log('[State] Resetting selected suggestion index')
    setSelectedSuggestionIndex(-1)
    searchPerformed.current = true

    try {
      const data = await fetchSearchResults(searchQuery)
      console.log('[State] Setting search results:', data.hits.length, 'hits')
      setResults(data.hits)
      console.log('[State] Setting search stats:', {
        took: data.took,
        count: data.hits.length
      })
      setSearchStats({ took: data.took, count: data.hits.length })
    } catch (err) {
      console.error('[State] Setting error state')
      setError('Search failed. Please try again.')
      console.error('[API Error] Search error:', err)
    } finally {
      console.log('[State] Setting loading = false')
      setLoading(false)
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    console.log('[User Action] Input changed:', newValue)
    setQuery(newValue)
    setSelectedSuggestionIndex(-1)
    searchPerformed.current = false
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('[User Action] Key pressed:', e.key)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        const newIndex = selectedSuggestionIndex < suggestions.length - 1
          ? selectedSuggestionIndex + 1
          : 0
        console.log('[User Action] Arrow down - selecting suggestion index:', newIndex)
        setSelectedSuggestionIndex(newIndex)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        const newIndex = selectedSuggestionIndex > 0
          ? selectedSuggestionIndex - 1
          : suggestions.length - 1
        console.log('[User Action] Arrow up - selecting suggestion index:', newIndex)
        setSelectedSuggestionIndex(newIndex)
      }
    } else if (e.key === 'Enter') {
      if (showSuggestions && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        console.log('[User Action] Enter key - selecting highlighted suggestion:', suggestions[selectedSuggestionIndex].text)
        handleSuggestionClick(suggestions[selectedSuggestionIndex].text)
      } else {
        console.log('[User Action] Enter key - triggering search')
        performSearch(query)
      }
    } else if (e.key === 'Escape') {
      console.log('[User Action] Escape key - hiding suggestions')
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    console.log('[User Action] Suggestion clicked:', suggestion)
    console.log('[State] Setting query to:', suggestion)
    setQuery(suggestion)
    console.log('[State] Hiding suggestions dropdown')
    setShowSuggestions(false)
    performSearch(suggestion)
  }

  // Truncate text to 500 characters
  const truncateText = (text: string, maxLength: number = 500): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Wikipedia Search
          </h1>
          <p className="text-gray-600 text-lg">
            Hybrid search powered by Nixiesearch
          </p>
        </div>

        {/* Search Box */}
        <div className="relative mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search Wikipedia articles..."
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              onFocus={() => {
                console.log('[User Action] Input focused')
                if (suggestions.length > 0) {
                  console.log('[State] Showing suggestions dropdown (has', suggestions.length, 'suggestions)')
                  setShowSuggestions(true)
                }
              }}
              className="pl-10 h-14 text-lg shadow-lg border-2 focus:border-blue-400"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                    idx === selectedSuggestionIndex
                      ? 'bg-blue-100'
                      : 'hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center">
                    <Search size={16} className="text-gray-400 mr-3" />
                    <span className="text-gray-800">{suggestion.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Stats */}
        {searchStats && (
          <div className="mb-6 text-sm text-gray-600">
            Found {searchStats.count} results in {searchStats.took.toFixed(3)} seconds
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((hit) => (
              <Card
                key={hit._id}
                className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl text-blue-600 hover:text-blue-700">
                      {hit.title}
                    </CardTitle>
                    <Badge variant="secondary" className="ml-4 shrink-0">
                      Score: {hit._score.toFixed(4)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {truncateText(hit.content)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && searchPerformed.current && results.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No results found</h3>
            <p className="text-gray-600">Try a different search term</p>
          </div>
        )}

        {/* Initial State */}
        {!loading && !searchPerformed.current && results.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Start searching</h3>
            <p className="text-gray-600">Enter a query to search Wikipedia articles</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
