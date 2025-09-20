import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Copy, Hash, Trash2, Share } from 'lucide-react';
import { 
  processTextDiff, 
  debounce, 
  validateTextInput, 
  optimizeTextForDiff,
  handleEmptyDiff,
  getDiffStats,
  formatDiffForClipboard
} from '@/utils/textDiffProcessor';
import { copyToClipboard } from '@/utils/clipboardHelper';
import { usePersistentState, generateShareableURL } from '@/utils/statePersistence';
import { ToolErrorBoundary } from '../ErrorBoundary';
import { DiffResult } from '@/types';
import './DiffChecker.css';

interface DiffCheckerPersistentState {
  originalText: string;
  modifiedText: string;
  showLineNumbers: boolean;
}

interface DiffCheckerLocalState {
  diffResult: DiffResult[];
  isProcessing: boolean;
  error: string | null;
  copySuccess: boolean;
}

const DiffCheckerCore: React.FC = () => {
  // Use persistent state for data that should survive page reloads
  const [persistentState, setPersistentState] = usePersistentState<DiffCheckerPersistentState>('diff-checker', {
    originalText: '',
    modifiedText: '',
    showLineNumbers: true
  });

  // Local state for UI feedback and processing state
  const [localState, setLocalState] = useState<DiffCheckerLocalState>({
    diffResult: [],
    isProcessing: false,
    error: null,
    copySuccess: false
  });

  // Extract values for easier access
  const { originalText, modifiedText, showLineNumbers } = persistentState;
  const { diffResult, isProcessing, error, copySuccess } = localState;

// Debounced diff processing function - defined outside the component to prevent recreation
const debouncedProcessDiff = debounce((
  originalText: string,
  modifiedText: string,
  setLocalState: React.Dispatch<React.SetStateAction<DiffCheckerLocalState>>
) => {
  // Set processing state
  setLocalState(prev => ({ ...prev, isProcessing: true, error: null }));

  try {
    // Validate input sizes
    const originalValidation = validateTextInput(originalText);
    const modifiedValidation = validateTextInput(modifiedText);

    if (!originalValidation.isValid) {
      setLocalState(prev => ({
        ...prev,
        isProcessing: false,
        error: `Original text: ${originalValidation.error}`,
        diffResult: []
      }));
      return;
    }

    if (!modifiedValidation.isValid) {
      setLocalState(prev => ({
        ...prev,
        isProcessing: false,
        error: `Modified text: ${modifiedValidation.error}`,
        diffResult: []
      }));
      return;
    }

    // Optimize large texts for performance
    const optimizedOriginal = optimizeTextForDiff(originalText);
    const optimizedModified = optimizeTextForDiff(modifiedText);

    // Process the diff
    const diffResult = processTextDiff(optimizedOriginal.text, optimizedModified.text);

    // Update state with results
    setLocalState(prev => ({
      ...prev,
      diffResult,
      isProcessing: false,
      error: optimizedOriginal.truncated || optimizedModified.truncated 
        ? 'Large text was truncated for performance. Consider processing smaller chunks.'
        : null
    }));
  } catch (error) {
    setLocalState(prev => ({
      ...prev,
      isProcessing: false,
      error: `Error processing diff: ${error instanceof Error ? error.message : 'Unknown error'}`,
      diffResult: []
    }));
  }
}, 300); // 300ms debounce delay

  // Effect to trigger diff processing when text changes
  useEffect(() => {
    if (originalText || modifiedText) {
      debouncedProcessDiff(originalText, modifiedText);
    } else {
      // Clear diff result when both texts are empty
      setLocalState(prev => ({
        ...prev,
        diffResult: [],
        isProcessing: false,
        error: null
      }));
    }
  }, [originalText, modifiedText, debouncedProcessDiff]);

  // Memoized diff stats for performance
  const diffStats = useMemo(() => {
    if (diffResult.length === 0) return null;
    return getDiffStats(diffResult);
  }, [diffResult]);

  const handleOriginalTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPersistentState({
      originalText: e.target.value
    });
    // Clear copy success state when text changes
    setLocalState(prev => ({ ...prev, copySuccess: false }));
  }, [setPersistentState]);

  const handleModifiedTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPersistentState({
      modifiedText: e.target.value
    });
    // Clear copy success state when text changes
    setLocalState(prev => ({ ...prev, copySuccess: false }));
  }, [setPersistentState]);

  const handleToggleLineNumbers = useCallback(() => {
    setPersistentState({
      showLineNumbers: !showLineNumbers
    });
  }, [showLineNumbers, setPersistentState]);

  const handleCopyDiff = useCallback(async () => {
    if (diffResult.length === 0) return;

    try {
      const diffText = formatDiffForClipboard(diffResult, true);
      await copyToClipboard(diffText);
      
      setLocalState(prev => ({ ...prev, copySuccess: true }));
      
      // Reset copy success state after 2 seconds
      setTimeout(() => {
        setLocalState(prev => ({ ...prev, copySuccess: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy diff to clipboard:', error);
      setLocalState(prev => ({ 
        ...prev, 
        error: 'Failed to copy to clipboard. Please try again.' 
      }));
    }
  }, [diffResult]);

  // Handle clearing all inputs
  const handleClearAll = useCallback(() => {
    setPersistentState({
      originalText: '',
      modifiedText: ''
    });
    setLocalState(prev => ({
      ...prev,
      copySuccess: false,
      error: null
    }));
  }, [setPersistentState]);

  // Handle sharing functionality
  const handleShare = useCallback(async () => {
    try {
      const shareableURL = generateShareableURL('/diff-checker', persistentState);
      await copyToClipboard(shareableURL);
      
      setLocalState(prev => ({ ...prev, copySuccess: true }));
      
      // Reset copy success state after 2 seconds
      setTimeout(() => {
        setLocalState(prev => ({ ...prev, copySuccess: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy shareable URL:', error);
      setLocalState(prev => ({ 
        ...prev, 
        error: 'Failed to copy shareable URL. Please try again.' 
      }));
    }
  }, [persistentState]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + K to clear all
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleClearAll();
    }
    // Ctrl/Cmd + Shift + C to copy diff
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C' && diffResult.length > 0) {
      e.preventDefault();
      handleCopyDiff();
    }
  }, [handleClearAll, handleCopyDiff, diffResult.length]);

  return (
    <div className="diff-checker-container container mx-auto p-4 space-y-6" onKeyDown={handleKeyDown}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2" id="diff-checker-title">Text Diff Checker</h1>
        <p className="text-muted-foreground" id="diff-checker-description">
          Compare two text blocks and see differences highlighted in GitHub-style format
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          disabled={!originalText && !modifiedText}
          aria-label="Copy shareable URL to clipboard"
          className="touch-manipulation min-h-[44px]"
        >
          <Share className="h-4 w-4 mr-2" aria-hidden="true" />
          Share
        </Button>
        <Button
          onClick={handleClearAll}
          variant="outline"
          size="sm"
          disabled={!originalText && !modifiedText}
          aria-label="Clear both text inputs"
          className="touch-manipulation min-h-[44px]"
        >
          <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
          Clear All
        </Button>
      </div>

      {/* Input Section */}
      <div className="diff-checker-inputs grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original Text Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Original Text</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="original-text" className="sr-only">
                Original text input
              </Label>
              <Textarea
                id="original-text"
                placeholder="Paste your original text here..."
                value={originalText}
                onChange={handleOriginalTextChange}
                className="diff-checker-textarea min-h-[300px] font-mono text-sm resize-none"
                aria-label="Original text input"
                aria-describedby="original-text-description"
              />
              <div id="original-text-description" className="sr-only">
                Enter the original version of your text for comparison
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modified Text Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modified Text</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="modified-text" className="sr-only">
                Modified text input
              </Label>
              <Textarea
                id="modified-text"
                placeholder="Paste your modified text here..."
                value={modifiedText}
                onChange={handleModifiedTextChange}
                className="diff-checker-textarea min-h-[300px] font-mono text-sm resize-none"
                aria-label="Modified text input"
                aria-describedby="modified-text-description"
              />
              <div id="modified-text-description" className="sr-only">
                Enter the modified version of your text for comparison
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diff Output Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Diff Output</span>
            <div className="flex items-center gap-4">
              {diffStats && (
                <span className="text-sm font-normal text-muted-foreground">
                  <span className="text-green-600 dark:text-green-400">+{diffStats.additions}</span>{' '}
                  <span className="text-red-600 dark:text-red-400">-{diffStats.deletions}</span>{' '}
                  ({diffStats.total} lines)
                </span>
              )}
              {diffResult.length > 0 && (
                <div className="flex items-center gap-2">
                  <Toggle
                    pressed={showLineNumbers}
                    onPressedChange={handleToggleLineNumbers}
                    aria-label={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
                    aria-pressed={showLineNumbers}
                    size="sm"
                    className="h-8"
                  >
                    <Hash className="h-3 w-3" aria-hidden="true" />
                  </Toggle>
                  <Button
                    onClick={handleCopyDiff}
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={diffResult.length === 0}
                    aria-label={copySuccess ? 'Diff copied to clipboard' : 'Copy diff to clipboard'}
                  >
                    <Copy className="h-3 w-3 mr-1" aria-hidden="true" />
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px]">
            {isProcessing ? (
              <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
                <div className="text-muted-foreground">Processing diff...</div>
              </div>
            ) : error ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md" role="alert">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            ) : diffResult.length === 0 ? (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-muted-foreground text-center">
                  {handleEmptyDiff(originalText, modifiedText)}
                </p>
              </div>
            ) : (
              <div className="diff-output-container" role="region" aria-label="Diff comparison results" aria-describedby="diff-output-description">
                <div id="diff-output-description" className="sr-only">
                  Diff comparison showing additions in green with plus signs, deletions in red with minus signs, and unchanged lines in normal text.
                </div>
                <div className="diff-output font-mono text-sm bg-card border rounded-md overflow-hidden">
                  <div className="diff-content overflow-auto max-h-[600px]">
                    {diffResult.map((result, index) => (
                      <div
                        key={index}
                        className={`diff-line flex items-start hover:bg-muted/50 transition-colors ${
                          result.type === 'added' 
                            ? 'bg-green-50 dark:bg-green-950/20 border-l-2 border-green-500' 
                            : result.type === 'removed'
                            ? 'bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500'
                            : 'bg-background hover:bg-muted/30'
                        }`}
                      >
                        {showLineNumbers && (
                          <div className="diff-line-number flex-shrink-0 w-12 px-2 py-1 text-xs text-muted-foreground text-right bg-muted/30 border-r select-none">
                            {result.lineNumber || ''}
                          </div>
                        )}
                        <div className="diff-marker flex-shrink-0 w-6 px-1 py-1 text-center font-bold">
                          <span className={`${
                            result.type === 'added' 
                              ? 'text-green-600 dark:text-green-400' 
                              : result.type === 'removed'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-muted-foreground/50'
                          }`}>
                            {result.type === 'added' ? '+' : result.type === 'removed' ? '-' : ' '}
                          </span>
                        </div>
                        <div className={`diff-content flex-1 px-2 py-1 whitespace-pre-wrap break-all ${
                          result.type === 'added' 
                            ? 'text-green-800 dark:text-green-200' 
                            : result.type === 'removed'
                            ? 'text-red-800 dark:text-red-200'
                            : 'text-foreground'
                        }`}>
                          {result.value || '\u00A0'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Features:</h4>
              <ul className="space-y-1">
                <li>• GitHub-style diff display</li>
                <li>• Real-time comparison</li>
                <li>• Line number toggle</li>
                <li>• Copy diff to clipboard</li>
                <li>• Shareable URLs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Keyboard shortcuts:</h4>
              <ul className="space-y-1">
                <li>• <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+K</kbd> Clear all</li>
                <li>• <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+Shift+C</kbd> Copy diff</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrapper component with error boundary
const DiffChecker: React.FC = () => {
  const handleRetry = () => {
    // Force re-render by reloading the page
    window.location.reload();
  };

  const handleGoBack = () => {
    window.location.hash = '#/home';
  };

  return (
    <ToolErrorBoundary 
      toolName="Diff Checker"
      onRetry={handleRetry}
      onGoBack={handleGoBack}
    >
      <DiffCheckerCore />
    </ToolErrorBoundary>
  );
};

export default DiffChecker;