"use client";

/**
 * Wikipedia Playground
 *
 * Interactive component for testing Wikipedia API integration.
 * Demonstrates the useWikipedia hooks with real-time search and content fetching.
 */

import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@proto/ui/atoms";

import {
  useWikipediaQuery,
  useWikipediaSearchQuery,
  useWikipediaPage,
  useWikipediaConfig,
  type WikipediaLanguage,
} from "../../client";

interface WikipediaPlaygroundProps {
  defaultQuery?: string;
  defaultLanguage?: WikipediaLanguage;
}

// Language code to name mapping
function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    ja: "Japanese",
    zh: "Chinese",
    ru: "Russian",
    pt: "Portuguese",
    it: "Italian",
    ar: "Arabic",
  };
  return names[code] || code.toUpperCase();
}

export function WikipediaPlayground({
  defaultQuery = "Albert Einstein",
  defaultLanguage = "en",
}: WikipediaPlaygroundProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [language, setLanguage] = useState<WikipediaLanguage>(defaultLanguage);
  const [topKResults, setTopKResults] = useState(2);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);

  const { config, languages } = useWikipediaConfig();

  // Full query (search + content)
  const {
    mutate: runQuery,
    isPending: isQuerying,
    error: queryError,
    data: queryData,
    reset: resetQuery,
  } = useWikipediaQuery({
    onSuccess: (result) => {
      console.log("Wikipedia query successful:", result);
      if (result.pages.length > 0) {
        setSelectedPageId(result.pages[0].pageId);
      }
    },
  });

  // Search only
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useWikipediaSearchQuery(query, {
    language,
    limit: 5,
    enabled: false, // Manual trigger
  });

  // Fetch specific page
  const {
    data: selectedPage,
    isLoading: isLoadingPage,
    error: pageError,
  } = useWikipediaPage(selectedPageId, {
    language,
    enabled: !!selectedPageId,
  });

  const handleQuery = () => {
    if (!query.trim()) return;

    runQuery({
      query,
      language,
      topKResults,
      maxContentLength: config.defaults.maxContentLength,
    });
  };

  const handleReset = () => {
    resetQuery();
    setQuery(defaultQuery);
    setLanguage(defaultLanguage);
    setSelectedPageId(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Wikipedia Playground</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {languages.length} Languages Supported
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Query Wikipedia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <Input
                id="query"
                placeholder="Enter search term..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleQuery();
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={language}
                  onValueChange={(value) =>
                    setLanguage(value as WikipediaLanguage)
                  }
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {getLanguageName(lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="results">Top Results</Label>
                <Input
                  id="results"
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={topKResults}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const clamped = isNaN(parsed)
                      ? 1
                      : Math.max(1, Math.min(10, parsed));
                    setTopKResults(clamped);
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleQuery}
                disabled={isQuerying || !query.trim()}
                className="flex-1"
              >
                {isQuerying ? "Searching..." : "Search Wikipedia"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isQuerying && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Searching Wikipedia...
                  </p>
                </div>
              </div>
            )}

            {queryError && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <h3 className="font-semibold text-destructive mb-2">Error</h3>
                <p className="text-sm text-destructive/90">
                  {queryError.message}
                </p>
              </div>
            )}

            {queryData && !isQuerying && !queryError && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">
                      Found {queryData.totalResults} result(s)
                    </h3>
                    <Badge variant="outline">{queryData.language}</Badge>
                  </div>
                  {queryData.pages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No pages found for &quot;{queryData.query}&quot;
                    </p>
                  ) : (
                    <div className="space-y-4 mt-4">
                      {queryData.pages.map((page) => (
                        <div
                          key={page.pageId}
                          className="border rounded-lg p-3 bg-background cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedPageId(page.pageId)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-sm">
                              {page.title}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {page.wordCount} words
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {page.summary}
                          </p>
                          {page.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {page.categories.slice(0, 3).map((cat) => (
                                <Badge
                                  key={cat}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!queryData && !isQuerying && !queryError && (
              <div className="flex items-center justify-center h-64 text-center">
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Enter a query and click Search to see results
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Page Load Error Display */}
      {pageError && selectedPageId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              Failed to Load Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <p className="text-sm text-destructive/90">{pageError.message}</p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPageId(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Page View */}
      {selectedPage && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedPage.title}</CardTitle>
                <a
                  href={selectedPage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View on Wikipedia →
                </a>
              </div>
              {selectedPage.imageUrl && (
                <img
                  src={selectedPage.imageUrl}
                  alt={selectedPage.title}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="content">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="categories">
                  Categories ({selectedPage.categories.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedPage.content}</p>
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Page ID:</span>{" "}
                    {selectedPage.pageId}
                  </div>
                  <div>
                    <span className="font-semibold">Word Count:</span>{" "}
                    {selectedPage.wordCount}
                  </div>
                  <div>
                    <span className="font-semibold">Language:</span>{" "}
                    {selectedPage.language}
                  </div>
                  <div>
                    <span className="font-semibold">Last Modified:</span>{" "}
                    {new Date(selectedPage.lastModified).toLocaleDateString()}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="categories" className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {selectedPage.categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Example Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Example Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ExampleCard
              title="Person"
              query="Marie Curie"
              onApply={(q) => {
                setQuery(q);
                setLanguage("en");
              }}
            />
            <ExampleCard
              title="Place"
              query="Paris"
              onApply={(q) => {
                setQuery(q);
                setLanguage("en");
              }}
            />
            <ExampleCard
              title="Concept"
              query="Quantum mechanics"
              onApply={(q) => {
                setQuery(q);
                setLanguage("en");
              }}
            />
            <ExampleCard
              title="Event"
              query="Apollo 11"
              onApply={(q) => {
                setQuery(q);
                setLanguage("en");
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ExampleCardProps {
  title: string;
  query: string;
  onApply: (query: string) => void;
}

function ExampleCard({ title, query, onApply }: ExampleCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground">{query}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApply(query)}
        className="w-full"
      >
        Try
      </Button>
    </div>
  );
}
