import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, Share, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboardHelper';
import { usePersistentState, generateShareableURL } from '@/utils/statePersistence';
import { ToolErrorBoundary } from '../ErrorBoundary';
import './JWTDecoder.css';

interface JWTDecoderPersistentState {
  token: string;
}

interface JWTDecoderLocalState {
  header: any | null;
  payload: any | null;
  signature: string | null;
  error: string | null;
  copySuccess: boolean;
  isExpired: boolean | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
}

interface DecodedJWT {
  header: any;
  payload: any;
  signature: string;
}

const JWTDecoderCore: React.FC = () => {
  // Use persistent state for data that should survive page reloads
  const [persistentState, setPersistentState] = usePersistentState<JWTDecoderPersistentState>('jwt-decoder', {
    token: ''
  });

  // Local state for UI feedback and processing state
  const [localState, setLocalState] = useState<JWTDecoderLocalState>({
    header: null,
    payload: null,
    signature: null,
    error: null,
    copySuccess: false,
    isExpired: null,
    issuedAt: null,
    expiresAt: null
  });

  // Extract values for easier access
  const { token } = persistentState;
  const { header, payload, signature, error, copySuccess, isExpired, issuedAt, expiresAt } = localState;

  // Base64URL decode function
  const base64UrlDecode = useCallback((str: string): string => {
    try {
      // Replace URL-safe characters
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

      // Pad with '=' to make length multiple of 4
      const pad = base64.length % 4;
      if (pad) {
        if (pad === 1) {
          throw new Error('Invalid base64url string');
        }
        base64 += '='.repeat(4 - pad);
      }

      // Decode base64
      const decoded = atob(base64);

      // Handle UTF-8 encoding
      return decodeURIComponent(
        decoded.split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
    } catch (error) {
      throw new Error('Failed to decode base64url string');
    }
  }, []);

  // Decode JWT token
  const decodeJWT = useCallback((token: string): DecodedJWT | null => {
    if (!token || !token.trim()) {
      return null;
    }

    try {
      // JWT should have 3 parts separated by dots
      const parts = token.trim().split('.');

      if (parts.length !== 3) {
        throw new Error('Invalid JWT format. Expected 3 parts separated by dots (header.payload.signature)');
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Decode header
      const headerJson = base64UrlDecode(headerB64);
      const header = JSON.parse(headerJson);

      // Decode payload
      const payloadJson = base64UrlDecode(payloadB64);
      const payload = JSON.parse(payloadJson);

      // Signature is kept as base64url encoded
      const signature = signatureB64;

      return { header, payload, signature };
    } catch (error) {
      throw error;
    }
  }, [base64UrlDecode]);

  // Validate expiration and timestamps
  const validateToken = useCallback((payload: any) => {
    const now = Date.now() / 1000; // Current time in seconds

    let isExpired: boolean | null = null;
    let issuedAt: Date | null = null;
    let expiresAt: Date | null = null;

    // Check expiration (exp)
    if (payload.exp !== undefined) {
      isExpired = payload.exp < now;
      expiresAt = new Date(payload.exp * 1000);
    }

    // Check issued at (iat)
    if (payload.iat !== undefined) {
      issuedAt = new Date(payload.iat * 1000);
    }

    return { isExpired, issuedAt, expiresAt };
  }, []);

  // Process JWT token
  const processToken = useCallback((token: string) => {
    if (!token || !token.trim()) {
      setLocalState(prev => ({
        ...prev,
        header: null,
        payload: null,
        signature: null,
        error: null,
        isExpired: null,
        issuedAt: null,
        expiresAt: null
      }));
      return;
    }

    try {
      const decoded = decodeJWT(token);

      if (!decoded) {
        setLocalState(prev => ({
          ...prev,
          header: null,
          payload: null,
          signature: null,
          error: null,
          isExpired: null,
          issuedAt: null,
          expiresAt: null
        }));
        return;
      }

      const { isExpired, issuedAt, expiresAt } = validateToken(decoded.payload);

      setLocalState(prev => ({
        ...prev,
        header: decoded.header,
        payload: decoded.payload,
        signature: decoded.signature,
        error: null,
        isExpired,
        issuedAt,
        expiresAt
      }));
    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        header: null,
        payload: null,
        signature: null,
        error: error instanceof Error ? error.message : 'Failed to decode JWT',
        isExpired: null,
        issuedAt: null,
        expiresAt: null
      }));
    }
  }, [decodeJWT, validateToken]);

  // Effect to trigger token processing when token changes
  useEffect(() => {
    processToken(token);
  }, [token, processToken]);

  const handleTokenChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPersistentState({
      token: e.target.value
    });
    setLocalState(prev => ({ ...prev, copySuccess: false }));
  }, [setPersistentState]);

  const handleCopyDecoded = useCallback(async () => {
    if (!header || !payload) return;

    try {
      const decodedText = JSON.stringify(
        {
          header,
          payload,
          signature
        },
        null,
        2
      );

      await copyToClipboard(decodedText);

      setLocalState(prev => ({ ...prev, copySuccess: true }));

      setTimeout(() => {
        setLocalState(prev => ({ ...prev, copySuccess: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy decoded JWT to clipboard:', error);
    }
  }, [header, payload, signature]);

  const handleClearAll = useCallback(() => {
    setPersistentState({
      token: ''
    });
    setLocalState(prev => ({
      ...prev,
      copySuccess: false,
      error: null
    }));
  }, [setPersistentState]);

  const handleShare = useCallback(async () => {
    try {
      const shareableURL = generateShareableURL('/jwt-decoder', persistentState);
      await copyToClipboard(shareableURL);

      setLocalState(prev => ({ ...prev, copySuccess: true }));

      setTimeout(() => {
        setLocalState(prev => ({ ...prev, copySuccess: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy shareable URL:', error);
    }
  }, [persistentState]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleClearAll();
    }
  }, [handleClearAll]);

  // Format date helper
  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleString();
  };

  // Calculate time until expiration
  const timeUntilExpiration = useMemo(() => {
    if (!expiresAt) return null;

    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff < 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [expiresAt]);

  // Get common claim names with descriptions
  const getClaimDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      iss: 'Issuer - identifies principal that issued the JWT',
      sub: 'Subject - identifies the subject of the JWT',
      aud: 'Audience - identifies the recipients of the JWT',
      exp: 'Expiration Time - identifies the expiration time',
      nbf: 'Not Before - identifies the time before which the JWT must not be accepted',
      iat: 'Issued At - identifies the time at which the JWT was issued',
      jti: 'JWT ID - unique identifier for the JWT',
      alg: 'Algorithm - identifies the cryptographic algorithm',
      typ: 'Type - declares the media type of the JWT',
      kid: 'Key ID - hint indicating which key was used to secure the JWS'
    };
    return descriptions[key] || '';
  };

  return (
    <div className="jwt-decoder-container container mx-auto p-4 space-y-6" onKeyDown={handleKeyDown}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">JWT Decoder</h1>
        <p className="text-muted-foreground">
          Decode and inspect JSON Web Tokens (JWT)
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          disabled={!token}
          className="touch-manipulation min-h-[44px]"
        >
          <Share className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button
          onClick={handleClearAll}
          variant="outline"
          size="sm"
          disabled={!token}
          className="touch-manipulation min-h-[44px]"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>

      {/* Token Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">JWT Token</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="jwt-token">Paste your JWT token</Label>
            <Textarea
              id="jwt-token"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
              value={token}
              onChange={handleTokenChange}
              className="min-h-[150px] font-mono text-sm"
              aria-describedby="token-error"
            />
            {error && (
              <div id="token-error" className="text-sm text-destructive flex items-start gap-2" role="alert">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Status */}
      {(header || error) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Token Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {header && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Valid JWT Structure</span>
                  </div>

                  {isExpired !== null && (
                    <div className="flex items-center gap-2">
                      {isExpired ? (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="text-sm font-medium">Token Expired</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium">Token Valid</span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {issuedAt && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Issued At</Label>
                        <p className="text-sm font-mono">{formatDate(issuedAt)}</p>
                      </div>
                    )}
                    {expiresAt && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Expires At</Label>
                        <p className="text-sm font-mono">{formatDate(expiresAt)}</p>
                        {timeUntilExpiration && (
                          <Badge
                            variant={isExpired ? 'destructive' : 'secondary'}
                            className="mt-1"
                          >
                            {timeUntilExpiration}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decoded Header */}
      {header && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Header</span>
              <Badge variant="outline" className="font-mono text-xs">
                {header.alg || 'Unknown Algorithm'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(header).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-mono text-sm">{key}</Label>
                    {getClaimDescription(key) && (
                      <span className="text-xs text-muted-foreground">
                        ({getClaimDescription(key)})
                      </span>
                    )}
                  </div>
                  <pre className="p-2 bg-muted rounded text-sm font-mono overflow-x-auto">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decoded Payload */}
      {payload && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Payload</span>
              <Button
                onClick={handleCopyDecoded}
                variant="outline"
                size="sm"
              >
                <Copy className="h-3 w-3 mr-1" />
                {copySuccess ? 'Copied!' : 'Copy All'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(payload).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-mono text-sm">{key}</Label>
                    {getClaimDescription(key) && (
                      <span className="text-xs text-muted-foreground">
                        ({getClaimDescription(key)})
                      </span>
                    )}
                  </div>
                  <pre className="p-2 bg-muted rounded text-sm font-mono overflow-x-auto">
                    {typeof value === 'object'
                      ? JSON.stringify(value, null, 2)
                      : (key === 'exp' || key === 'iat' || key === 'nbf') && typeof value === 'number'
                      ? `${value} (${formatDate(new Date(value * 1000))})`
                      : String(value)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature */}
      {signature && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                Base64Url encoded signature (verification requires the secret key)
              </p>
              <pre className="p-3 bg-muted rounded text-sm font-mono overflow-x-auto break-all whitespace-pre-wrap">
                {signature}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      {!token && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <h4 className="font-medium text-foreground mb-3">About JWT Decoder</h4>
              <p>
                A JSON Web Token (JWT) is a compact, URL-safe means of representing claims to be transferred between two parties.
                This tool allows you to decode and inspect JWTs without verification.
              </p>
              <div className="pt-3">
                <h5 className="font-medium text-foreground mb-2">Features:</h5>
                <ul className="space-y-1 pl-4">
                  <li>• Decode JWT header, payload, and signature</li>
                  <li>• Validate token expiration</li>
                  <li>• Display common JWT claims with descriptions</li>
                  <li>• Show timestamp information in human-readable format</li>
                  <li>• Shareable URLs</li>
                </ul>
              </div>
              <div className="pt-3">
                <h5 className="font-medium text-foreground mb-2">Keyboard shortcuts:</h5>
                <ul className="space-y-1 pl-4">
                  <li>• <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+K</kbd> Clear all</li>
                </ul>
              </div>
              <div className="pt-3 border-t mt-3">
                <p className="text-xs italic">
                  ⚠️ Note: This tool only decodes JWTs. It does not verify the signature. Never paste sensitive tokens into untrusted tools.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Wrapper component with error boundary
const JWTDecoder: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    window.location.hash = '#/home';
  };

  return (
    <ToolErrorBoundary
      toolName="JWT Decoder"
      onRetry={handleRetry}
      onGoBack={handleGoBack}
    >
      <JWTDecoderCore />
    </ToolErrorBoundary>
  );
};

export default JWTDecoder;
