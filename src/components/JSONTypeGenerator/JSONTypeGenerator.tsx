import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CopyIcon, TrashIcon, AlertCircleIcon, CheckIcon, ShareIcon, Code2Icon } from 'lucide-react';

import { errorHandler } from '@/utils/errorHandler';
import { clipboardHelper } from '@/utils/clipboardHelper';
import { usePersistentState, generateShareableURL } from '@/utils/statePersistence';
import { ToolErrorBoundary } from '../ErrorBoundary';
import { JSONTypeGeneratorState } from '@/types';
import {
  parseJSONSafely,
  analyzeJSONStructure,
  generateTypeScriptInterface,
  generateJSDocTypes,
  generatePythonTypedDict,
  generatePythonDataclass,
  generatePydanticModel
} from '@/utils/jsonTypeGenerator';

const JSONTypeGeneratorCore: React.FC = () => {
  // Use persistent state for main tool state (excluding jsonInput to avoid cursor jumping)
  const [persistentState, setPersistentState] = usePersistentState<Omit<JSONTypeGeneratorState, 'jsonInput'>>('json-type-generator', {
    selectedFormat: 'typescript' as const,
    generatedOutput: '',
    error: null
  });

  // Local state for input (to prevent cursor jumping) and UI feedback
  const [jsonInput, setJsonInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract values from persistent state
  const { selectedFormat, generatedOutput, error } = persistentState;

  // Initialize jsonInput from URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const stateParam = urlParams.get('state');
    if (stateParam) {
      try {
        const decodedState = JSON.parse(decodeURIComponent(stateParam));
        if (decodedState.jsonInput) {
          setJsonInput(decodedState.jsonInput);
        }
      } catch (err) {
        // Ignore URL parsing errors
      }
    }
  }, []);

  // Format options for the selector
  const formatOptions = useMemo(() => [
    { value: 'typescript', label: 'TypeScript Interfaces', icon: '🔷' },
    { value: 'jsdoc', label: 'JSDoc Types', icon: '📝' },
    { value: 'python-typeddict', label: 'Python TypedDict', icon: '🐍' },
    { value: 'python-dataclass', label: 'Python Dataclass', icon: '🏗️' },
    { value: 'pydantic-v2', label: 'Pydantic v2 Models', icon: '⚡' }
  ] as const, []);

  // Debounced effect for JSON processing
  useEffect(() => {
    const processJSON = async (input: string, format: JSONTypeGeneratorState['selectedFormat']) => {
      if (!input.trim()) {
        setPersistentState({ 
          generatedOutput: '',
          error: null
        });
        return;
      }

      setIsProcessing(true);

      try {
        // Parse JSON safely
        const { data, error: parseError } = parseJSONSafely(input);
        
        if (parseError || data === null) {
          setPersistentState({ 
            generatedOutput: '',
            error: parseError || 'Failed to parse JSON'
          });
          return;
        }

        // Analyze JSON structure
        const schema = analyzeJSONStructure(data);
        
        // Generate type definitions based on selected format
        const options = {
          format,
          rootTypeName: 'RootType',
          useOptionalFields: true
        };

        let result;
        switch (format) {
          case 'typescript':
            result = generateTypeScriptInterface(schema, options);
            break;
          case 'jsdoc':
            result = generateJSDocTypes(schema, options);
            break;
          case 'python-typeddict':
            result = generatePythonTypedDict(schema, options);
            break;
          case 'python-dataclass':
            result = generatePythonDataclass(schema, options);
            break;
          case 'pydantic-v2':
            result = generatePydanticModel(schema, options);
            break;
          default:
            throw new Error(`Unsupported format: ${format}`);
        }

        setPersistentState({ 
          generatedOutput: result.content,
          error: null
        });

      } catch (err) {
        const errorInfo = errorHandler.formatError(err);
        setPersistentState({ 
          generatedOutput: '',
          error: `Type generation failed: ${errorInfo.message}`
        });
      } finally {
        setIsProcessing(false);
      }
    };

    const timeoutId = setTimeout(() => {
      processJSON(jsonInput, selectedFormat);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [jsonInput, selectedFormat]);

  // Handle JSON input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value;
    setJsonInput(newInput); // Only update local state to prevent re-renders
    setIsCopied(false); // Clear copy success state
  };

  // Handle format selection change
  const handleFormatChange = (newFormat: JSONTypeGeneratorState['selectedFormat']) => {
    setPersistentState({ 
      selectedFormat: newFormat
    });
    setIsCopied(false); // Clear copy success state
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!generatedOutput) return;

    try {
      const success = await clipboardHelper.copy(generatedOutput);
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        setPersistentState({ error: 'Failed to copy to clipboard. Please copy manually.' });
      }
    } catch (err) {
      const errorInfo = errorHandler.getClipboardError(err);
      setPersistentState({ error: errorInfo.message });
    }
  };

  // Handle clear input
  const handleClearInput = () => {
    setJsonInput(''); // Clear local input state
    setPersistentState({ 
      generatedOutput: '',
      error: null
    });
    setIsCopied(false);
  };

  // Handle clearing all data (including persistent state)
  const handleClearAll = () => {
    setJsonInput('');
    setPersistentState({
      selectedFormat: 'typescript' as const,
      generatedOutput: '',
      error: null
    });
    setIsCopied(false);
  };

  // Handle share functionality
  const handleShare = async () => {
    try {
      // Include current jsonInput in the shareable state
      const shareableState = { ...persistentState, jsonInput };
      const shareableURL = generateShareableURL('/json-type-generator', shareableState);
      await clipboardHelper.copy(shareableURL);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      const errorInfo = errorHandler.getClipboardError(err);
      setPersistentState({ error: errorInfo.message });
    }
  };

  // Handle clear output
  const handleClearOutput = () => {
    setPersistentState({ generatedOutput: '' });
    setIsCopied(false);
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + K to clear all
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleClearAll();
    }
    // Ctrl/Cmd + Shift + C to copy output
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C' && generatedOutput) {
      e.preventDefault();
      handleCopy();
    }
  }, [handleClearAll, handleCopy, generatedOutput]);

  // Memoized placeholder text for JSON input
  const jsonPlaceholderText = useMemo(() => {
    return `Enter JSON data here...

Example:
{
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "tags": ["developer", "typescript"],
    "profile": {
      "bio": "Software engineer",
      "avatar": null
    }
  }
}`;
  }, []);

  // Memoized placeholder text for output based on selected format
  const outputPlaceholderText = useMemo(() => {
    const formatLabels = {
      'typescript': 'TypeScript interfaces',
      'jsdoc': 'JSDoc type definitions',
      'python-typeddict': 'Python TypedDict classes',
      'python-dataclass': 'Python dataclass structures',
      'pydantic-v2': 'Pydantic v2 BaseModel classes'
    };
    
    return `Generated ${formatLabels[selectedFormat]} will appear here...`;
  }, [selectedFormat]);





  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" id="json-type-generator-title">
          <Code2Icon className="h-6 w-6" aria-hidden="true" />
          JSON Type Generator
        </h1>
        <p className="text-muted-foreground mt-2" id="json-type-generator-description">
          Generate type definitions from JSON data in multiple languages and formats
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Output Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <label htmlFor="format-select" className="text-sm text-muted-foreground whitespace-nowrap">Format:</label>
              <div id="format-description" className="sr-only">Choose the output format for generated type definitions</div>
              <Select value={selectedFormat} onValueChange={handleFormatChange}>
                <SelectTrigger 
                  className="touch-manipulation min-h-[44px]"
                  aria-label="Select output format"
                  aria-describedby="format-description"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  disabled={!jsonInput}
                  title="Copy shareable URL"
                  aria-label="Copy shareable URL to clipboard"
                  className="touch-manipulation min-h-[44px] flex-1 sm:flex-none"
                >
                  <ShareIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="ml-2">Share</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearInput}
                  disabled={!jsonInput}
                  aria-label="Clear JSON input"
                  className="touch-manipulation min-h-[44px] flex-1 sm:flex-none"
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="ml-2">Clear Input</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={!jsonInput && !generatedOutput}
                  aria-label="Clear both input and output"
                  className="touch-manipulation min-h-[44px] flex-1 sm:flex-none"
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="ml-2">Clear All</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Alert inside JSON Input card */}
            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Textarea
              value={jsonInput}
              onChange={handleInputChange}
              placeholder={jsonPlaceholderText}
              className="min-h-[200px] sm:min-h-[300px] font-mono text-sm touch-manipulation"
              aria-label="JSON input"
              aria-describedby="json-input-description"
              id="json-input"
            />
            <div id="json-input-description" className="sr-only">
              Enter JSON data to generate type definitions. The tool will automatically validate and process your input.
            </div>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Generated Types
                {isProcessing && (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" aria-hidden="true" />
                    <span className="sr-only">Processing JSON input...</span>
                  </>
                )}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!generatedOutput || isProcessing}
                  aria-label={isCopied ? 'Copied to clipboard' : 'Copy generated types to clipboard'}
                  className="touch-manipulation min-h-[44px] flex-1 sm:flex-none"
                >
                  {isCopied ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : <CopyIcon className="h-4 w-4" aria-hidden="true" />}
                  <span className="ml-2">{isCopied ? 'Copied!' : 'Copy'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearOutput}
                  disabled={!generatedOutput || isProcessing}
                  aria-label="Clear generated output"
                  className="touch-manipulation min-h-[44px] flex-1 sm:flex-none"
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="ml-2">Clear</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={isProcessing ? 'Processing...' : generatedOutput}
              readOnly
              placeholder={outputPlaceholderText}
              className="min-h-[200px] sm:min-h-[300px] font-mono text-sm bg-muted/50 touch-manipulation"
              aria-label="Generated type definitions"
              aria-describedby="output-description"
              id="generated-output"
              aria-live="polite"
              aria-atomic="true"
            />
            <div id="output-description" className="sr-only">
              Generated type definitions based on your JSON input. This area updates automatically when you modify the input.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Features:</h4>
              <ul className="space-y-1">
                <li>• Real-time JSON validation</li>
                <li>• Multiple output formats</li>
                <li>• Modern type syntax support</li>
                <li>• Nested structure handling</li>
                <li>• Copy to clipboard</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Supported formats:</h4>
              <ul className="space-y-1">
                <li>• TypeScript interfaces</li>
                <li>• JSDoc type annotations</li>
                <li>• Python TypedDict</li>
                <li>• Python dataclasses</li>
                <li>• Pydantic v2 models</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Keyboard shortcuts:</h4>
              <ul className="space-y-1">
                <li>• <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+K</kbd> Clear all</li>
                <li>• <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+Shift+C</kbd> Copy output</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrapper component with error boundary
const JSONTypeGenerator: React.FC = () => {
  const handleRetry = () => {
    // Force re-render by updating key
    window.location.reload();
  };

  const handleGoBack = () => {
    window.location.hash = '#/home';
  };

  return (
    <ToolErrorBoundary 
      toolName="JSON Type Generator"
      onRetry={handleRetry}
      onGoBack={handleGoBack}
    >
      <JSONTypeGeneratorCore />
    </ToolErrorBoundary>
  );
};

export default JSONTypeGenerator;