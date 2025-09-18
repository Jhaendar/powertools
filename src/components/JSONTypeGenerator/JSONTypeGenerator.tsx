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
  // Use persistent state for main tool state
  const [persistentState, setPersistentState] = usePersistentState<JSONTypeGeneratorState>('json-type-generator', {
    jsonInput: '',
    selectedFormat: 'typescript' as const,
    generatedOutput: '',
    error: null
  });

  // Local state for UI feedback
  const [isCopied, setIsCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract values from persistent state
  const { jsonInput, selectedFormat, generatedOutput, error } = persistentState;

  // Format options for the selector
  const formatOptions = useMemo(() => [
    { value: 'typescript', label: 'TypeScript Interfaces', icon: '🔷' },
    { value: 'jsdoc', label: 'JSDoc Types', icon: '📝' },
    { value: 'python-typeddict', label: 'Python TypedDict', icon: '🐍' },
    { value: 'python-dataclass', label: 'Python Dataclass', icon: '🏗️' },
    { value: 'pydantic-v2', label: 'Pydantic v2 Models', icon: '⚡' }
  ] as const, []);

  // Debounced JSON processing function
  const processJSON = useCallback(
    async (input: string, format: JSONTypeGeneratorState['selectedFormat']) => {
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
    },
    [setPersistentState]
  );

  // Debounced effect for JSON processing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      processJSON(jsonInput, selectedFormat);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [jsonInput, selectedFormat, processJSON]);

  // Handle JSON input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value;
    setPersistentState({ 
      jsonInput: newInput
    });
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
    setPersistentState({ 
      jsonInput: '',
      generatedOutput: '',
      error: null
    });
    setIsCopied(false);
  };

  // Handle share functionality
  const handleShare = async () => {
    try {
      const shareableURL = generateShareableURL('/json-type-generator', persistentState);
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

  // Simple syntax highlighting function for generated output
  const applySyntaxHighlighting = (code: string, format: JSONTypeGeneratorState['selectedFormat']): string => {
    if (!code || isProcessing) return code;

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const escapedCode = escapeHtml(code);
    let highlightedCode = escapedCode;

    switch (format) {
      case 'typescript':
        // TypeScript syntax highlighting
        highlightedCode = highlightedCode
          .replace(/\b(interface|type|export|import|from)\b/g, '<span class="text-blue-600 font-semibold">$1</span>')
          .replace(/\b(string|number|boolean|null|undefined|Array|Record|unknown)\b/g, '<span class="text-emerald-600 font-medium">$1</span>')
          .replace(/(\w+)(\s*\??\s*:)/g, '<span class="text-purple-600">$1</span>$2')
          .replace(/(\|)/g, '<span class="text-orange-500 font-bold">$1</span>')
          .replace(/([{}[\];,])/g, '<span class="text-gray-600">$1</span>');
        break;

      case 'jsdoc':
        // JSDoc syntax highlighting
        highlightedCode = highlightedCode
          .replace(/(\/\*\*[\s\S]*?\*\/)/g, '<span class="text-gray-500 italic">$1</span>')
          .replace(/(@typedef|@property)/g, '<span class="text-blue-600 font-semibold">$1</span>')
          .replace(/\{([^}]+)\}/g, '{<span class="text-emerald-600 font-medium">$1</span>}')
          .replace(/\[(\w+)\]/g, '[<span class="text-purple-600">$1</span>]');
        break;

      case 'python-typeddict':
      case 'python-dataclass':
      case 'pydantic-v2':
        // Python syntax highlighting
        highlightedCode = highlightedCode
          .replace(/\b(from|import|class|def|return)\b/g, '<span class="text-blue-600 font-semibold">$1</span>')
          .replace(/\b(None|True|False)\b/g, '<span class="text-purple-600 font-semibold">$1</span>')
          .replace(/\b(TypedDict|dataclass|BaseModel|Field|field|default_factory)\b/g, '<span class="text-orange-600 font-medium">$1</span>')
          .replace(/\b(str|int|float|bool|list|dict|object)\b/g, '<span class="text-emerald-600 font-medium">$1</span>')
          .replace(/(\w+)(\s*:)/g, '<span class="text-purple-600">$1</span>$2')
          .replace(/(@\w+)/g, '<span class="text-yellow-600 font-semibold">$1</span>')
          .replace(/(#.*$)/gm, '<span class="text-gray-500 italic">$1</span>')
          .replace(/([{}[\](),=])/g, '<span class="text-gray-600">$1</span>');
        break;

      default:
        return escapedCode;
    }

    return highlightedCode;
  };



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Code2Icon className="h-6 w-6" />
          JSON Type Generator
        </h2>
        <p className="text-muted-foreground mt-2">
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
              <span className="text-sm text-muted-foreground whitespace-nowrap">Format:</span>
              <Select value={selectedFormat} onValueChange={handleFormatChange}>
                <SelectTrigger className="touch-manipulation min-h-[44px]">
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
                  className="touch-manipulation min-h-[44px] flex-1 sm:flex-none"
                >
                  <ShareIcon className="h-4 w-4" />
                  <span className="ml-2">Share</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearInput}
                  disabled={!jsonInput}
                  className="touch-manipulation min-h-[44px] flex-1 sm:flex-none"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span className="ml-2">Clear</span>
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
            />
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Generated Types
                {isProcessing && (
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                )}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!generatedOutput || isProcessing}
                  className="touch-manipulation min-h-[44px] flex-1 sm:flex-none"
                >
                  {isCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                  <span className="ml-2">{isCopied ? 'Copied!' : 'Copy'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearOutput}
                  disabled={!generatedOutput || isProcessing}
                  className="touch-manipulation min-h-[44px] flex-1 sm:flex-none"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span className="ml-2">Clear</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {generatedOutput && !isProcessing ? (
              <div 
                className="min-h-[200px] sm:min-h-[300px] font-mono text-sm bg-muted/50 border border-input rounded-md p-3 overflow-auto whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: applySyntaxHighlighting(generatedOutput, selectedFormat) 
                }}
                aria-label="Generated type definitions with syntax highlighting"
              />
            ) : (
              <Textarea
                value={isProcessing ? 'Processing...' : ''}
                readOnly
                placeholder={outputPlaceholderText}
                className="min-h-[200px] sm:min-h-[300px] font-mono text-sm bg-muted/50 touch-manipulation"
                aria-label="Generated type definitions"
              />
            )}
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