import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Share, AlertTriangle } from 'lucide-react';
import { fileParser } from '../../utils/fileParser';
import { clipboardHelper } from '../../utils/clipboardHelper';
import { errorHandler } from '../../utils/errorHandler';
import { ParsedCSV } from '../../types';
import { usePersistentState, generateShareableURL } from '../../utils/statePersistence';
import { ToolErrorBoundary } from '../ErrorBoundary';
import { virtualizationManager } from '../../utils/virtualization';
import { performanceMonitor } from '../../utils/performanceMonitor';

interface CSVViewerState {
  rawInput: string;
  rowLimit: number;
  currentPage: number;
  hasHeaders: boolean | null;
}

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  total: number;
}

const CSVViewerCore: React.FC = () => {
  // Use persistent state for main tool state
  const [persistentState, setPersistentState] = usePersistentState<CSVViewerState>('csv-viewer', {
    rawInput: '',
    rowLimit: 50,
    currentPage: 1,
    hasHeaders: null
  });

  // Local state for UI feedback and computed values
  const [csvData, setCsvData] = useState<ParsedCSV>({
    headers: [],
    rows: [],
    totalRows: 0,
    hasHeaders: false
  });
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    total: 0
  });
  const [performanceWarning, setPerformanceWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract values from persistent state
  const { rawInput, rowLimit, currentPage, hasHeaders } = persistentState;

  // Parse CSV when component mounts with persisted input
  useEffect(() => {
    if (rawInput) {
      parseCSV(rawInput);
    }
  }, []); // Only run on mount

  const parseCSV = useCallback(async (content: string) => {
    const endMeasurement = performanceMonitor.startMeasurement('CSV Parsing');
    
    try {
      setError(null);
      setPerformanceWarning(null);
      
      if (!content.trim()) {
        setCsvData({
          headers: [],
          rows: [],
          totalRows: 0,
          hasHeaders: false
        });
        return;
      }

      const dataSize = new Blob([content]).size;
      
      // For large files, show processing state and use chunked processing
      if (dataSize > 100 * 1024) { // 100KB threshold
        setProcessingState({ isProcessing: true, progress: 0, total: 100 });
        
        // Add small delay to show processing state
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const parsed = fileParser.parseCSV(content, hasHeaders ?? undefined);
      
      // If dataset is large, process in chunks for better performance
      if (parsed.totalRows > 1000) {
        const chunkSize = virtualizationManager.calculateOptimalChunkSize(
          parsed.totalRows, 
          'medium'
        );
        
        // Process rows in chunks to avoid blocking UI
        const processedRows = await virtualizationManager.processInChunks(
          parsed.rows,
          (row) => row, // Identity function for now
          {
            chunkSize,
            delayMs: 1,
            onProgress: (processed, total) => {
              setProcessingState({
                isProcessing: true,
                progress: Math.round((processed / total) * 100),
                total
              });
            }
          }
        );
        
        parsed.rows = processedRows;
      }
      
      setCsvData(parsed);
      setPersistentState({ currentPage: 1 }); // Reset to first page when new data is loaded
      
      // Record performance metrics
      const metrics = endMeasurement(parsed.totalRows, dataSize);
      
      // Show performance warning if needed
      if (performanceMonitor.isPerformanceDegraded(metrics)) {
        const recommendations = performanceMonitor.getPerformanceRecommendations(metrics);
        setPerformanceWarning(
          `Large dataset detected (${parsed.totalRows} rows, ${(dataSize / 1024).toFixed(1)}KB). ` +
          recommendations.slice(0, 2).join('. ')
        );
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      setCsvData({
        headers: [],
        rows: [],
        totalRows: 0,
        hasHeaders: false
      });
    } finally {
      setProcessingState({ isProcessing: false, progress: 0, total: 0 });
    }
  }, [hasHeaders, setPersistentState]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setPersistentState({ rawInput: content });
    parseCSV(content);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPersistentState({ rawInput: content });
      parseCSV(content);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPersistentState({ rawInput: text });
      parseCSV(text);
    } catch (err) {
      setError('Failed to read from clipboard. Please paste manually in the text area.');
    }
  };

  const handleClear = () => {
    setPersistentState({ rawInput: '', currentPage: 1 });
    setCsvData({
      headers: [],
      rows: [],
      totalRows: 0,
      hasHeaders: false
    });
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRowLimitChange = (value: string) => {
    const limit = parseInt(value, 10);
    setPersistentState({ rowLimit: limit, currentPage: 1 }); // Reset to first page when limit changes
  };

  const handleHeaderToggle = (value: string) => {
    const newHasHeaders = value === 'true' ? true : value === 'false' ? false : null;
    setPersistentState({ hasHeaders: newHasHeaders });
    if (rawInput) {
      parseCSV(rawInput);
    }
  };

  // Calculate pagination with performance optimization
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(csvData.totalRows / rowLimit);
    const startIndex = (currentPage - 1) * rowLimit;
    const endIndex = Math.min(startIndex + rowLimit, csvData.totalRows);
    
    // Use efficient slicing for large datasets
    const visibleRows = csvData.totalRows > 10000 
      ? virtualizationManager.efficientSlice(csvData.rows, startIndex, endIndex)
      : csvData.rows.slice(startIndex, endIndex);
    
    return { totalPages, startIndex, endIndex, visibleRows };
  }, [csvData.rows, csvData.totalRows, currentPage, rowLimit]);
  
  const { totalPages, startIndex, endIndex, visibleRows } = paginationData;

  const handlePreviousPage = () => {
    setPersistentState({ currentPage: Math.max(1, currentPage - 1) });
  };

  const handleNextPage = () => {
    setPersistentState({ currentPage: Math.min(totalPages, currentPage + 1) });
  };

  const handleShare = async () => {
    try {
      const shareableURL = generateShareableURL('/csv-viewer', persistentState);
      await clipboardHelper.copy(shareableURL);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (err) {
      const errorInfo = errorHandler.getClipboardError(err);
      setError(errorInfo.message);
    }
  };

  const copyTableData = async () => {
    try {
      let csvContent = '';
      
      // Add headers if present
      if (csvData.hasHeaders && csvData.headers.length > 0) {
        csvContent += csvData.headers.join(',') + '\n';
      }
      
      // Add visible rows
      csvContent += visibleRows.map(row => row.join(',')).join('\n');
      
      await clipboardHelper.copy(csvContent);
    } catch (err) {
      setError('Failed to copy table data');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CSV Table Viewer</CardTitle>
              <CardDescription>
                Upload a CSV file or paste CSV data to view it in a table format with configurable row limits and pagination.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={!rawInput}
              title="Copy shareable URL"
            >
              <Share className="h-4 w-4" />
              {shareSuccess ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload and Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="row-limit">Rows per page</Label>
              <Select value={rowLimit.toString()} onValueChange={handleRowLimitChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                  <SelectItem value="200">200 rows</SelectItem>
                  <SelectItem value="500">500 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="header-detection">Header Detection</Label>
              <Select 
                value={hasHeaders === null ? 'auto' : hasHeaders.toString()} 
                onValueChange={handleHeaderToggle}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="true">Has headers</SelectItem>
                  <SelectItem value="false">No headers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePaste} variant="outline">
              Paste from Clipboard
            </Button>
            <Button onClick={handleClear} variant="outline">
              Clear
            </Button>
            {csvData.totalRows > 0 && (
              <Button onClick={copyTableData} variant="outline">
                Copy Visible Data
              </Button>
            )}
          </div>

          {/* Text Input Area */}
          <div className="space-y-2">
            <Label htmlFor="csv-input">Or paste CSV data directly:</Label>
            <textarea
              id="csv-input"
              className="w-full h-32 p-3 border rounded-md resize-vertical font-mono text-sm"
              placeholder="Paste your CSV data here..."
              value={rawInput}
              onChange={handleTextareaChange}
            />
          </div>

          {/* Processing State */}
          {processingState.isProcessing && (
            <Alert>
              <AlertDescription>
                Processing large CSV file... {processingState.progress}%
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${processingState.progress}%` }}
                  ></div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Performance Warning */}
          {performanceWarning && (
            <Alert variant="default" className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {performanceWarning}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Data Info */}
          {csvData.totalRows > 0 && (
            <div className="text-sm text-muted-foreground">
              Total rows: {csvData.totalRows} | 
              Columns: {csvData.headers.length} | 
              Headers: {csvData.hasHeaders ? 'Yes' : 'No'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Display */}
      {csvData.totalRows > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Table View</CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{endIndex} of {csvData.totalRows} rows
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvData.headers.map((header, index) => (
                      <TableHead key={index} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row, rowIndex) => (
                    <TableRow key={startIndex + rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="whitespace-nowrap">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Wrapper component with error boundary
const CSVViewer: React.FC = () => {
  const handleRetry = () => {
    // Force re-render by updating key
    window.location.reload();
  };

  const handleGoBack = () => {
    window.location.hash = '#/home';
  };

  return (
    <ToolErrorBoundary 
      toolName="CSV Viewer"
      onRetry={handleRetry}
      onGoBack={handleGoBack}
    >
      <CSVViewerCore />
    </ToolErrorBoundary>
  );
};

export default CSVViewer;