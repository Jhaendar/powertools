import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CopyIcon, TrashIcon, AlertCircleIcon, CheckIcon, ShareIcon } from 'lucide-react';
import { inputValidator } from '@/utils/inputValidator';
import { errorHandler } from '@/utils/errorHandler';
import { clipboardHelper } from '@/utils/clipboardHelper';
import { usePersistentState, generateShareableURL } from '@/utils/statePersistence';
import { ToolErrorBoundary } from '../ErrorBoundary';

interface JSONConverterState {
  input: string;
  isFormatted: boolean;
  outerDelimiter: '"' | "'";
}

const JSONConverterCore: React.FC = () => {
  // Use persistent state for main tool state
  const [persistentState, setPersistentState] = usePersistentState<JSONConverterState>('json-converter', {
    input: '',
    isFormatted: true,
    outerDelimiter: '"' as const
  });

  // Local state for UI feedback and computed values
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Extract values from persistent state
  const { input, isFormatted, outerDelimiter } = persistentState;

  // Real-time JSON processing
  const processJSON = useCallback((value: string) => {
    if (!value.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    // Validate JSON input
    const validation = inputValidator.validateJSON(value);
    
    if (!validation.isValid) {
      setError(validation.errors.join('. '));
      setOutput('');
      return;
    }

    try {
      // Parse and stringify JSON
      const parsed = JSON.parse(value);
      let stringified = isFormatted 
        ? JSON.stringify(parsed, null, 2)
        : JSON.stringify(parsed);
      
      // Apply outer delimiter wrapping and escaping
      if (outerDelimiter === '"') {
        // Escape internal double quotes and wrap in double quotes
        stringified = '"' + stringified.replace(/"/g, '\\"') + '"';
      } else {
        // Wrap in single quotes (no need to escape internal double quotes)
        stringified = "'" + stringified + "'";
      }
      
      setOutput(stringified);
      setError(null);
    } catch (err) {
      const errorInfo = errorHandler.getJSONError(err);
      setError(errorInfo.message);
      setOutput('');
    }
  }, [isFormatted, outerDelimiter]);

  // Process input whenever it changes or format toggle changes
  React.useEffect(() => {
    processJSON(input);
  }, [input, processJSON]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPersistentState({ input: e.target.value });
    setIsCopied(false); // Clear copy success state
  };

  // Handle format toggle
  const handleFormatToggle = (pressed: boolean) => {
    setPersistentState({ isFormatted: pressed });
  };

  // Handle outer delimiter toggle
  const handleOuterDelimiterToggle = (pressed: boolean) => {
    setPersistentState({ outerDelimiter: pressed ? "'" : '"' });
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!output) return;

    try {
      const success = await clipboardHelper.copy(output);
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        setError('Failed to copy to clipboard. Please copy manually.');
      }
    } catch (err) {
      const errorInfo = errorHandler.getClipboardError(err);
      setError(errorInfo.message);
    }
  };

  // Handle clear input
  const handleClearInput = () => {
    setPersistentState({ input: '' });
    setOutput('');
    setError(null);
    setIsCopied(false);
  };

  // Handle share functionality
  const handleShare = async () => {
    try {
      const shareableURL = generateShareableURL('/json-converter', persistentState);
      await clipboardHelper.copy(shareableURL);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      const errorInfo = errorHandler.getClipboardError(err);
      setError(errorInfo.message);
    }
  };

  // Handle clear output
  const handleClearOutput = () => {
    setOutput('');
    setIsCopied(false);
  };

  // Memoized placeholder text
  const placeholderText = useMemo(() => {
    return `Enter JSON here...

Example:
{
  "name": "John Doe",
  "age": 30,
  "city": "New York"
}`;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">JSON Converter</h2>
        <p className="text-muted-foreground mt-2">
          Convert JSON to formatted or minified string output with real-time validation
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Format:</span>
              <Toggle
                pressed={isFormatted}
                onPressedChange={handleFormatToggle}
                aria-label="Toggle formatted output"
                variant="outline"
              >
                {isFormatted ? 'Pretty' : 'Minified'}
              </Toggle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Outer Delimiter:</span>
              <Toggle
                pressed={outerDelimiter === "'"}
                onPressedChange={handleOuterDelimiterToggle}
                aria-label="Toggle outer delimiter"
                variant="outline"
              >
                {outerDelimiter === '"' ? 'Double "' : "Single '"}
              </Toggle>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>JSON Input</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  disabled={!input}
                  title="Copy shareable URL"
                >
                  <ShareIcon />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearInput}
                  disabled={!input}
                >
                  <TrashIcon />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Alert inside JSON Input card */}
            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Invalid JSON</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder={placeholderText}
              className="min-h-[300px] font-mono text-sm"
              aria-label="JSON input"
            />
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>String Output</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!output}
                >
                  {isCopied ? <CheckIcon /> : <CopyIcon />}
                  {isCopied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearOutput}
                  disabled={!output}
                >
                  <TrashIcon />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={output}
              readOnly
              placeholder="Converted JSON will appear here..."
              className="min-h-[300px] font-mono text-sm bg-muted/50"
              aria-label="JSON string output"
            />
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Features:</h4>
              <ul className="space-y-1">
                <li>• Real-time JSON validation</li>
                <li>• Pretty-print or minify output</li>
                <li>• Configurable outer delimiters</li>
                <li>• Copy to clipboard with visual feedback</li>
                <li>• Clear input/output</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Supported formats:</h4>
              <ul className="space-y-1">
                <li>• JSON objects and arrays</li>
                <li>• Strings, numbers, booleans</li>
                <li>• Nested structures</li>
                <li>• null values</li>
                <li>• Automatic quote escaping</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrapper component with error boundary
const JSONConverter: React.FC = () => {
  const handleRetry = () => {
    // Force re-render by updating key
    window.location.reload();
  };

  const handleGoBack = () => {
    window.location.hash = '#/home';
  };

  return (
    <ToolErrorBoundary 
      toolName="JSON Converter"
      onRetry={handleRetry}
      onGoBack={handleGoBack}
    >
      <JSONConverterCore />
    </ToolErrorBoundary>
  );
};

export default JSONConverter;