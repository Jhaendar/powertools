import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Copy, Trash2, Share, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { copyToClipboard } from '@/utils/clipboardHelper';
import { usePersistentState, generateShareableURL } from '@/utils/statePersistence';
import { ToolErrorBoundary } from '../ErrorBoundary';
import './RegexTester.css';

interface RegexTesterPersistentState {
  pattern: string;
  testString: string;
  flags: {
    global: boolean;
    caseInsensitive: boolean;
    multiline: boolean;
    dotAll: boolean;
    unicode: boolean;
    sticky: boolean;
  };
}

interface RegexTesterLocalState {
  matches: RegExpMatchArray[] | null;
  error: string | null;
  copySuccess: boolean;
  showCheatsheet: boolean;
}

interface MatchHighlight {
  text: string;
  isMatch: boolean;
  matchIndex?: number;
  groups?: { [key: string]: string };
}

const RegexTesterCore: React.FC = () => {
  // Use persistent state for data that should survive page reloads
  const [persistentState, setPersistentState] = usePersistentState<RegexTesterPersistentState>('regex-tester', {
    pattern: '',
    testString: '',
    flags: {
      global: true,
      caseInsensitive: false,
      multiline: false,
      dotAll: false,
      unicode: false,
      sticky: false
    }
  });

  // Local state for UI feedback and processing state
  const [localState, setLocalState] = useState<RegexTesterLocalState>({
    matches: null,
    error: null,
    copySuccess: false,
    showCheatsheet: false
  });

  // Extract values for easier access
  const { pattern, testString, flags } = persistentState;
  const { matches, error, copySuccess, showCheatsheet } = localState;

  // Process regex matches
  const processRegex = useCallback((pattern: string, testString: string, flags: RegexTesterPersistentState['flags']) => {
    if (!pattern) {
      setLocalState(prev => ({
        ...prev,
        matches: null,
        error: null
      }));
      return;
    }

    try {
      // Build flags string
      const flagsString =
        (flags.global ? 'g' : '') +
        (flags.caseInsensitive ? 'i' : '') +
        (flags.multiline ? 'm' : '') +
        (flags.dotAll ? 's' : '') +
        (flags.unicode ? 'u' : '') +
        (flags.sticky ? 'y' : '');

      const regex = new RegExp(pattern, flagsString);

      // Get all matches
      const allMatches: RegExpMatchArray[] = [];

      if (flags.global) {
        let match;
        const globalRegex = new RegExp(pattern, flagsString);
        while ((match = globalRegex.exec(testString)) !== null) {
          allMatches.push(match);
          // Prevent infinite loops on zero-width matches
          if (match.index === globalRegex.lastIndex) {
            globalRegex.lastIndex++;
          }
        }
      } else {
        const match = testString.match(regex);
        if (match) {
          allMatches.push(match);
        }
      }

      setLocalState(prev => ({
        ...prev,
        matches: allMatches.length > 0 ? allMatches : null,
        error: null
      }));
    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        matches: null,
        error: error instanceof Error ? error.message : 'Invalid regex pattern'
      }));
    }
  }, []);

  // Effect to trigger regex processing when pattern, test string, or flags change
  useEffect(() => {
    processRegex(pattern, testString, flags);
  }, [pattern, testString, flags, processRegex]);

  // Generate highlighted text with matches
  const highlightedText = useMemo((): MatchHighlight[] => {
    if (!testString) return [];
    if (!matches || matches.length === 0) {
      return [{ text: testString, isMatch: false }];
    }

    const highlights: MatchHighlight[] = [];
    let lastIndex = 0;

    matches.forEach((match, matchIndex) => {
      const matchText = match[0];
      const matchStartIndex = match.index ?? 0;

      // Add text before match
      if (matchStartIndex > lastIndex) {
        highlights.push({
          text: testString.substring(lastIndex, matchStartIndex),
          isMatch: false
        });
      }

      // Add match
      highlights.push({
        text: matchText,
        isMatch: true,
        matchIndex,
        groups: match.groups
      });

      lastIndex = matchStartIndex + matchText.length;
    });

    // Add remaining text
    if (lastIndex < testString.length) {
      highlights.push({
        text: testString.substring(lastIndex),
        isMatch: false
      });
    }

    return highlights;
  }, [testString, matches]);

  const handlePatternChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPersistentState({
      pattern: e.target.value
    });
    setLocalState(prev => ({ ...prev, copySuccess: false }));
  }, [setPersistentState]);

  const handleTestStringChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPersistentState({
      testString: e.target.value
    });
    setLocalState(prev => ({ ...prev, copySuccess: false }));
  }, [setPersistentState]);

  const handleFlagToggle = useCallback((flagName: keyof RegexTesterPersistentState['flags']) => {
    setPersistentState({
      flags: {
        ...flags,
        [flagName]: !flags[flagName]
      }
    });
    setLocalState(prev => ({ ...prev, copySuccess: false }));
  }, [flags, setPersistentState]);

  const handleCopyMatches = useCallback(async () => {
    if (!matches || matches.length === 0) return;

    try {
      const matchesText = matches.map((match, index) => {
        const groups = match.slice(1).map((group, i) => `  Group ${i + 1}: ${group ?? '(no match)'}`).join('\n');
        return `Match ${index + 1}: ${match[0]}\n${groups ? groups + '\n' : ''}`;
      }).join('\n');

      await copyToClipboard(matchesText);

      setLocalState(prev => ({ ...prev, copySuccess: true }));

      setTimeout(() => {
        setLocalState(prev => ({ ...prev, copySuccess: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy matches to clipboard:', error);
    }
  }, [matches]);

  const handleClearAll = useCallback(() => {
    setPersistentState({
      pattern: '',
      testString: ''
    });
    setLocalState(prev => ({
      ...prev,
      copySuccess: false,
      error: null
    }));
  }, [setPersistentState]);

  const handleShare = useCallback(async () => {
    try {
      const shareableURL = generateShareableURL('/regex-tester', persistentState);
      await copyToClipboard(shareableURL);

      setLocalState(prev => ({ ...prev, copySuccess: true }));

      setTimeout(() => {
        setLocalState(prev => ({ ...prev, copySuccess: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy shareable URL:', error);
    }
  }, [persistentState]);

  const toggleCheatsheet = useCallback(() => {
    setLocalState(prev => ({ ...prev, showCheatsheet: !prev.showCheatsheet }));
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleClearAll();
    }
  }, [handleClearAll]);

  const matchCount = matches?.length ?? 0;

  return (
    <div className="regex-tester-container container mx-auto p-4 space-y-6" onKeyDown={handleKeyDown}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Regex Tester</h1>
        <p className="text-muted-foreground">
          Test regular expressions with live pattern matching and capture groups
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          onClick={toggleCheatsheet}
          variant="outline"
          size="sm"
          className="touch-manipulation min-h-[44px]"
        >
          <Info className="h-4 w-4 mr-2" />
          {showCheatsheet ? 'Hide' : 'Show'} Cheatsheet
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          disabled={!pattern && !testString}
          className="touch-manipulation min-h-[44px]"
        >
          <Share className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button
          onClick={handleClearAll}
          variant="outline"
          size="sm"
          disabled={!pattern && !testString}
          className="touch-manipulation min-h-[44px]"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>

      {/* Cheatsheet */}
      {showCheatsheet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Regular Expression Cheatsheet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Character Classes</h4>
                <ul className="space-y-1 font-mono text-xs">
                  <li><code>.</code> - Any character except newline</li>
                  <li><code>\d</code> - Digit (0-9)</li>
                  <li><code>\w</code> - Word character (a-z, A-Z, 0-9, _)</li>
                  <li><code>\s</code> - Whitespace</li>
                  <li><code>[abc]</code> - Any of a, b, or c</li>
                  <li><code>[^abc]</code> - Not a, b, or c</li>
                  <li><code>[a-z]</code> - Character range</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Anchors</h4>
                <ul className="space-y-1 font-mono text-xs">
                  <li><code>^</code> - Start of string</li>
                  <li><code>$</code> - End of string</li>
                  <li><code>\b</code> - Word boundary</li>
                  <li><code>\B</code> - Not word boundary</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Quantifiers</h4>
                <ul className="space-y-1 font-mono text-xs">
                  <li><code>*</code> - 0 or more</li>
                  <li><code>+</code> - 1 or more</li>
                  <li><code>?</code> - 0 or 1</li>
                  <li><code>{'{'}3{'}'}</code> - Exactly 3</li>
                  <li><code>{'{'}3,{'}'}</code> - 3 or more</li>
                  <li><code>{'{'}3,5{'}'}</code> - 3, 4, or 5</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Groups</h4>
                <ul className="space-y-1 font-mono text-xs">
                  <li><code>(abc)</code> - Capture group</li>
                  <li><code>(?:abc)</code> - Non-capturing group</li>
                  <li><code>(?{'<'}name{'>'}abc)</code> - Named capture group</li>
                  <li><code>|</code> - Alternation (OR)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Lookaround</h4>
                <ul className="space-y-1 font-mono text-xs">
                  <li><code>(?=abc)</code> - Positive lookahead</li>
                  <li><code>(?!abc)</code> - Negative lookahead</li>
                  <li><code>(?{'<'}=abc)</code> - Positive lookbehind</li>
                  <li><code>(?{'<'}!abc)</code> - Negative lookbehind</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Escape Sequences</h4>
                <ul className="space-y-1 font-mono text-xs">
                  <li><code>\n</code> - Newline</li>
                  <li><code>\t</code> - Tab</li>
                  <li><code>\r</code> - Carriage return</li>
                  <li><code>\\</code> - Backslash</li>
                  <li><code>\.</code> - Literal period</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Regular Expression Pattern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="regex-pattern">Pattern</Label>
            <Input
              id="regex-pattern"
              placeholder="Enter your regex pattern... e.g., \d{3}-\d{3}-\d{4}"
              value={pattern}
              onChange={handlePatternChange}
              className="font-mono"
              aria-describedby="pattern-error"
            />
            {error && (
              <div id="pattern-error" className="text-sm text-destructive" role="alert">
                {error}
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="space-y-2">
            <Label>Flags</Label>
            <div className="flex flex-wrap gap-2">
              <Toggle
                pressed={flags.global}
                onPressedChange={() => handleFlagToggle('global')}
                aria-label="Global flag (g)"
                size="sm"
              >
                <span className="font-mono">g</span>
                <span className="ml-2 text-xs">Global</span>
              </Toggle>
              <Toggle
                pressed={flags.caseInsensitive}
                onPressedChange={() => handleFlagToggle('caseInsensitive')}
                aria-label="Case insensitive flag (i)"
                size="sm"
              >
                <span className="font-mono">i</span>
                <span className="ml-2 text-xs">Ignore Case</span>
              </Toggle>
              <Toggle
                pressed={flags.multiline}
                onPressedChange={() => handleFlagToggle('multiline')}
                aria-label="Multiline flag (m)"
                size="sm"
              >
                <span className="font-mono">m</span>
                <span className="ml-2 text-xs">Multiline</span>
              </Toggle>
              <Toggle
                pressed={flags.dotAll}
                onPressedChange={() => handleFlagToggle('dotAll')}
                aria-label="Dot all flag (s)"
                size="sm"
              >
                <span className="font-mono">s</span>
                <span className="ml-2 text-xs">Dot All</span>
              </Toggle>
              <Toggle
                pressed={flags.unicode}
                onPressedChange={() => handleFlagToggle('unicode')}
                aria-label="Unicode flag (u)"
                size="sm"
              >
                <span className="font-mono">u</span>
                <span className="ml-2 text-xs">Unicode</span>
              </Toggle>
              <Toggle
                pressed={flags.sticky}
                onPressedChange={() => handleFlagToggle('sticky')}
                aria-label="Sticky flag (y)"
                size="sm"
              >
                <span className="font-mono">y</span>
                <span className="ml-2 text-xs">Sticky</span>
              </Toggle>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test String Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test String</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="test-string">Text to test against</Label>
            <Textarea
              id="test-string"
              placeholder="Enter text to test your regex pattern..."
              value={testString}
              onChange={handleTestStringChange}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>
              Results
              {matchCount > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({matchCount} match{matchCount !== 1 ? 'es' : ''})
                </span>
              )}
            </span>
            {matchCount > 0 && (
              <Button
                onClick={handleCopyMatches}
                variant="outline"
                size="sm"
              >
                <Copy className="h-3 w-3 mr-1" />
                {copySuccess ? 'Copied!' : 'Copy Matches'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pattern ? (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-muted-foreground text-center">
                Enter a regex pattern to start testing
              </p>
            </div>
          ) : !testString ? (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-muted-foreground text-center">
                Enter test text to see matches
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md" role="alert">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          ) : matchCount === 0 ? (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-muted-foreground text-center">
                No matches found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Highlighted Text */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Highlighted Matches</h4>
                <div className="p-4 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap break-words">
                  {highlightedText.map((highlight, index) => (
                    highlight.isMatch ? (
                      <mark
                        key={index}
                        className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded"
                        title={`Match ${(highlight.matchIndex ?? 0) + 1}`}
                      >
                        {highlight.text}
                      </mark>
                    ) : (
                      <span key={index}>{highlight.text}</span>
                    )
                  ))}
                </div>
              </div>

              {/* Match Details */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Match Details</h4>
                <div className="space-y-2">
                  {matches?.map((match, matchIndex) => (
                    <Collapsible key={matchIndex}>
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm">
                                Match {matchIndex + 1}: <span className="font-semibold">{match[0]}</span>
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Position: {match.index}
                              </span>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            {match.length > 1 && (
                              <div className="space-y-1">
                                <h5 className="text-xs font-semibold text-muted-foreground mb-1">Capture Groups:</h5>
                                {match.slice(1).map((group, groupIndex) => (
                                  <div key={groupIndex} className="flex items-start gap-2 text-sm font-mono">
                                    <span className="text-muted-foreground">Group {groupIndex + 1}:</span>
                                    <span className="flex-1 break-all">
                                      {group ?? <span className="text-muted-foreground italic">(no match)</span>}
                                    </span>
                                  </div>
                                ))}
                                {match.groups && Object.keys(match.groups).length > 0 && (
                                  <>
                                    <h5 className="text-xs font-semibold text-muted-foreground mt-2 mb-1">Named Groups:</h5>
                                    {Object.entries(match.groups).map(([name, value]) => (
                                      <div key={name} className="flex items-start gap-2 text-sm font-mono">
                                        <span className="text-muted-foreground">{name}:</span>
                                        <span className="flex-1 break-all">{value}</span>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Features:</h4>
              <ul className="space-y-1">
                <li>• Live pattern matching</li>
                <li>• Capture group visualization</li>
                <li>• Multiple regex flags</li>
                <li>• Match highlighting</li>
                <li>• Shareable URLs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Keyboard shortcuts:</h4>
              <ul className="space-y-1">
                <li>• <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+K</kbd> Clear all</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrapper component with error boundary
const RegexTester: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    window.location.hash = '#/home';
  };

  return (
    <ToolErrorBoundary
      toolName="Regex Tester"
      onRetry={handleRetry}
      onGoBack={handleGoBack}
    >
      <RegexTesterCore />
    </ToolErrorBoundary>
  );
};

export default RegexTester;
