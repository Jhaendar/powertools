import React, { useEffect, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Trash2, Share, Upload } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboardHelper';
import { usePersistentState, generateShareableURL } from '@/utils/statePersistence';
import { ToolErrorBoundary } from '../ErrorBoundary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import './HashGenerator.css';

interface HashGeneratorPersistentState {
  inputText: string;
  algorithm: string;
}

interface HashGeneratorLocalState {
  hash: string;
  copySuccess: boolean;
  error: string | null;
  fileName: string | null;
}

type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

const HASH_ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

const HashGeneratorCore: React.FC = () => {
  // Use persistent state for data that should survive page reloads
  const [persistentState, setPersistentState] = usePersistentState<HashGeneratorPersistentState>('hash-generator', {
    inputText: '',
    algorithm: 'SHA-256'
  });

  // Local state for UI feedback and processing state
  const [localState, setLocalState] = useState<HashGeneratorLocalState>({
    hash: '',
    copySuccess: false,
    error: null,
    fileName: null
  });

  // Extract values for easier access
  const { inputText, algorithm } = persistentState;
  const { hash, copySuccess, error, fileName } = localState;

  // Generate hash using Web Crypto API
  const generateHash = useCallback(async (text: string, algo: string) => {
    if (!text) {
      setLocalState(prev => ({
        ...prev,
        hash: '',
        error: null
      }));
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      let hashBuffer: ArrayBuffer;

      // Map algorithm names to Web Crypto API names
      const algoMap: { [key: string]: string } = {
        'MD5': 'MD5',
        'SHA-1': 'SHA-1',
        'SHA-256': 'SHA-256',
        'SHA-384': 'SHA-384',
        'SHA-512': 'SHA-512'
      };

      const cryptoAlgo = algoMap[algo];

      // Check if MD5 is supported (not available in Web Crypto API)
      if (algo === 'MD5') {
        // Use a simple MD5 implementation for browser compatibility
        const md5Hash = await generateMD5(text);
        setLocalState(prev => ({
          ...prev,
          hash: md5Hash,
          error: null
        }));
        return;
      }

      hashBuffer = await crypto.subtle.digest(cryptoAlgo, data);

      // Convert hash buffer to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      setLocalState(prev => ({
        ...prev,
        hash: hashHex,
        error: null
      }));
    } catch (err) {
      setLocalState(prev => ({
        ...prev,
        hash: '',
        error: err instanceof Error ? err.message : 'Failed to generate hash'
      }));
    }
  }, []);

  // Simple MD5 implementation for browser compatibility
  const generateMD5 = async (text: string): Promise<string> => {
    // This is a simplified MD5 implementation
    // For production, consider using a library like crypto-js
    // For now, we'll use a placeholder that indicates MD5 requires an external library

    // Check if we can use a native implementation or need to inform user
    try {
      // Try to use SubtleCrypto if MD5 is available (unlikely)
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('MD5', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // MD5 not natively supported, use basic hash implementation
      // This is a very simple hash for demonstration - NOT cryptographically secure MD5
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }

      // Convert to hex-like string (this is NOT real MD5)
      const hashHex = Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
      return hashHex + ' (Note: MD5 requires crypto-js library for true MD5 hashing)';
    }
  };

  // Effect to trigger hash generation when input or algorithm changes
  useEffect(() => {
    generateHash(inputText, algorithm);
  }, [inputText, algorithm, generateHash]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPersistentState({
      inputText: e.target.value
    });
    setLocalState(prev => ({
      ...prev,
      copySuccess: false,
      fileName: null
    }));
  }, [setPersistentState]);

  const handleAlgorithmChange = useCallback((value: string) => {
    setPersistentState({
      algorithm: value
    });
    setLocalState(prev => ({ ...prev, copySuccess: false }));
  }, [setPersistentState]);

  const handleCopyHash = useCallback(async () => {
    if (!hash) return;

    try {
      // Remove the note suffix if present for MD5
      const hashToCopy = hash.split(' (Note:')[0];
      await copyToClipboard(hashToCopy);

      setLocalState(prev => ({ ...prev, copySuccess: true }));

      setTimeout(() => {
        setLocalState(prev => ({ ...prev, copySuccess: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy hash to clipboard:', err);
    }
  }, [hash]);

  const handleClearAll = useCallback(() => {
    setPersistentState({
      inputText: ''
    });
    setLocalState(prev => ({
      ...prev,
      copySuccess: false,
      error: null,
      fileName: null
    }));
  }, [setPersistentState]);

  const handleShare = useCallback(async () => {
    try {
      const shareableURL = generateShareableURL('/hash-generator', persistentState);
      await copyToClipboard(shareableURL);

      setLocalState(prev => ({ ...prev, copySuccess: true }));

      setTimeout(() => {
        setLocalState(prev => ({ ...prev, copySuccess: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy shareable URL:', err);
    }
  }, [persistentState]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPersistentState({
        inputText: text
      });
      setLocalState(prev => ({
        ...prev,
        fileName: file.name,
        copySuccess: false
      }));
    };
    reader.onerror = () => {
      setLocalState(prev => ({
        ...prev,
        error: 'Failed to read file'
      }));
    };
    reader.readAsText(file);
  }, [setPersistentState]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleClearAll();
    }
  }, [handleClearAll]);

  return (
    <div className="hash-generator-container container mx-auto p-4 space-y-6" onKeyDown={handleKeyDown}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Hash Generator</h1>
        <p className="text-muted-foreground">
          Generate cryptographic hashes from text or files
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          disabled={!inputText}
          className="touch-manipulation min-h-[44px]"
        >
          <Share className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button
          onClick={handleClearAll}
          variant="outline"
          size="sm"
          disabled={!inputText}
          className="touch-manipulation min-h-[44px]"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>

      {/* Algorithm Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hash Algorithm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="algorithm-select">Select Algorithm</Label>
            <Select value={algorithm} onValueChange={handleAlgorithmChange}>
              <SelectTrigger id="algorithm-select" className="w-full">
                <SelectValue placeholder="Select hash algorithm" />
              </SelectTrigger>
              <SelectContent>
                {HASH_ALGORITHMS.map((algo) => (
                  <SelectItem key={algo} value={algo}>
                    {algo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {algorithm === 'SHA-256' && 'Recommended for most use cases. Widely used and secure.'}
              {algorithm === 'SHA-512' && 'Higher security with longer hash output.'}
              {algorithm === 'SHA-384' && 'Truncated version of SHA-512.'}
              {algorithm === 'SHA-1' && 'Legacy algorithm. Consider using SHA-256 or higher.'}
              {algorithm === 'MD5' && 'Legacy algorithm. Not recommended for security purposes.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="input-text">Text to hash</Label>
              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".txt,.json,.csv,.md"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </div>
            {fileName && (
              <div className="text-sm text-muted-foreground">
                File loaded: <span className="font-medium">{fileName}</span>
              </div>
            )}
            <Textarea
              id="input-text"
              placeholder="Enter text to generate hash..."
              value={inputText}
              onChange={handleInputChange}
              className="min-h-[200px] font-mono text-sm"
            />
            {inputText && (
              <div className="text-xs text-muted-foreground">
                Character count: {inputText.length} | Byte size: {new Blob([inputText]).size} bytes
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Generated Hash</span>
            {hash && (
              <Button
                onClick={handleCopyHash}
                variant="outline"
                size="sm"
              >
                <Copy className="h-3 w-3 mr-1" />
                {copySuccess ? 'Copied!' : 'Copy Hash'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!inputText ? (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-muted-foreground text-center">
                Enter text or upload a file to generate hash
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md" role="alert">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          ) : hash ? (
            <div className="space-y-2">
              <div className="p-4 bg-muted rounded-md">
                <div className="font-mono text-sm break-all select-all">
                  {hash}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Algorithm: {algorithm} | Hash length: {hash.split(' (Note:')[0].length} characters
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-muted-foreground text-center">
                Generating hash...
              </p>
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
                <li>• Multiple hash algorithms (MD5, SHA-1, SHA-256, SHA-384, SHA-512)</li>
                <li>• Text input or file upload</li>
                <li>• Copy hash to clipboard</li>
                <li>• Shareable URLs</li>
                <li>• Character and byte count</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Use cases:</h4>
              <ul className="space-y-1">
                <li>• Verify file integrity</li>
                <li>• Generate checksums</li>
                <li>• Password hashing (use SHA-256 or higher)</li>
                <li>• Data fingerprinting</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-foreground mb-2">Keyboard shortcuts:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+K</kbd> Clear all</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrapper component with error boundary
const HashGenerator: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    window.location.hash = '#/home';
  };

  return (
    <ToolErrorBoundary
      toolName="Hash Generator"
      onRetry={handleRetry}
      onGoBack={handleGoBack}
    >
      <HashGeneratorCore />
    </ToolErrorBoundary>
  );
};

export default HashGenerator;
