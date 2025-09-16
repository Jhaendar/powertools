import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Copy, ChevronDown, ChevronRight, Search, AlertCircle, GripVertical, Share, AlertTriangle } from 'lucide-react';
import { fileParser } from '../../utils/fileParser';
import { clipboardHelper } from '../../utils/clipboardHelper';
import { errorHandler } from '../../utils/errorHandler';
import { usePersistentState, generateShareableURL } from '../../utils/statePersistence';
import { ToolErrorBoundary } from '../ErrorBoundary';
import { performanceMonitor } from '../../utils/performanceMonitor';
// virtualizationManager import removed as it's not used in this component

interface TreeNode {
  key: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  path: string;
  children?: TreeNode[];
  isExpandable: boolean;
}

interface JSONVisualizerState {
  input: string;
  searchTerm: string;
  expandedNodes: string[];
  leftWidth: number;
}

const JSONVisualizerCore: React.FC = () => {
  // Use persistent state for main tool state
  const [persistentState, setPersistentState] = usePersistentState<JSONVisualizerState>('json-visualizer', {
    input: '',
    searchTerm: '',
    expandedNodes: [],
    leftWidth: 50
  });

  // Local state for UI feedback and computed values
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [performanceWarning, setPerformanceWarning] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract values from persistent state
  const { input, searchTerm, expandedNodes: expandedNodesList, leftWidth } = persistentState;
  
  // Convert expanded nodes array to Set for performance
  const expandedNodes = useMemo(() => new Set(expandedNodesList), [expandedNodesList]);

  // Helper function to count JSON nodes for performance monitoring
  const countJSONNodes = useCallback((data: any): number => {
    if (data === null || typeof data !== 'object') return 1;
    
    if (Array.isArray(data)) {
      return 1 + data.reduce((count: number, item: any) => count + countJSONNodes(item), 0);
    }
    
    return 1 + Object.values(data).reduce((count: number, value: any) => count + countJSONNodes(value), 0);
  }, []);

  // Parse JSON when component mounts with persisted input
  useEffect(() => {
    if (input) {
      handleInputChange(input);
    }
  }, []); // Only run on mount

  // Parse JSON input and generate tree structure
  const handleInputChange = useCallback(async (value: string) => {
    const endMeasurement = performanceMonitor.startMeasurement('JSON Parsing');
    
    setPersistentState({ input: value });
    setError(null);
    setCopySuccess(null);
    setPerformanceWarning(null);

    if (!value.trim()) {
      setParsedData(null);
      return;
    }

    const dataSize = new Blob([value]).size;
    
    // Show processing state for large JSON
    if (dataSize > 50 * 1024) { // 50KB threshold
      setIsProcessing(true);
      // Add small delay to show processing state
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    try {
      const result = fileParser.parseJSON(value);
      if (result.isValid) {
        setParsedData(result.data);
        
        // Count nodes for performance monitoring
        const nodeCount = countJSONNodes(result.data);
        const metrics = endMeasurement(nodeCount, dataSize);
        
        // Show performance warning if needed
        if (performanceMonitor.isPerformanceDegraded(metrics)) {
          const recommendations = performanceMonitor.getPerformanceRecommendations(metrics);
          setPerformanceWarning(
            `Large JSON detected (${nodeCount} nodes, ${(dataSize / 1024).toFixed(1)}KB). ` +
            recommendations.slice(0, 2).join('. ')
          );
        }
      } else {
        const errorInfo = errorHandler.getJSONError(new Error(result.error || 'Invalid JSON'));
        setError(errorInfo.message);
        setParsedData(null);
      }
    } catch (err) {
      const errorInfo = errorHandler.getJSONError(err);
      setError(errorInfo.message);
      setParsedData(null);
    } finally {
      setIsProcessing(false);
    }
  }, [setPersistentState]);

  // Generate tree structure from parsed data
  const treeData = useMemo(() => {
    if (!parsedData) return null;
    return generateTreeNodes(parsedData, 'root', '');
  }, [parsedData]);

  // Filter tree nodes based on search term
  const filteredTreeData = useMemo(() => {
    if (!treeData || !searchTerm.trim()) return treeData;
    return filterTreeNodes(treeData, searchTerm.toLowerCase());
  }, [treeData, searchTerm]);

  // Generate tree nodes recursively
  function generateTreeNodes(data: any, key: string, path: string): TreeNode[] {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (data === null) {
      return [{
        key,
        value: null,
        type: 'null',
        path: currentPath,
        isExpandable: false
      }];
    }

    if (Array.isArray(data)) {
      const children = data.map((item, index) => 
        generateTreeNodes(item, `[${index}]`, currentPath)
      ).flat();

      return [{
        key,
        value: data,
        type: 'array',
        path: currentPath,
        children,
        isExpandable: data.length > 0
      }];
    }

    if (typeof data === 'object') {
      const children = Object.entries(data).map(([objKey, objValue]) =>
        generateTreeNodes(objValue, objKey, currentPath)
      ).flat();

      return [{
        key,
        value: data,
        type: 'object',
        path: currentPath,
        children,
        isExpandable: Object.keys(data).length > 0
      }];
    }

    // Primitive values
    const type = typeof data as 'string' | 'number' | 'boolean';
    return [{
      key,
      value: data,
      type,
      path: currentPath,
      isExpandable: false
    }];
  }

  // Filter tree nodes based on search term
  function filterTreeNodes(nodes: TreeNode[], searchTerm: string): TreeNode[] {
    return nodes.map(node => {
      const matchesSearch = 
        node.key.toLowerCase().includes(searchTerm) ||
        (typeof node.value === 'string' && node.value.toLowerCase().includes(searchTerm)) ||
        node.path.toLowerCase().includes(searchTerm);

      if (node.children) {
        const filteredChildren = filterTreeNodes(node.children, searchTerm);
        const hasMatchingChildren = filteredChildren.length > 0;

        if (matchesSearch || hasMatchingChildren) {
          return {
            ...node,
            children: filteredChildren
          };
        }
        return null;
      }

      return matchesSearch ? node : null;
    }).filter((node): node is TreeNode => node !== null);
  }

  // Toggle node expansion
  const toggleNode = useCallback((path: string) => {
    const newSet = new Set(expandedNodes);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setPersistentState({ expandedNodes: Array.from(newSet) });
  }, [expandedNodes, setPersistentState]);

  // Copy value to clipboard
  const copyToClipboard = useCallback(async (value: any, path: string) => {
    try {
      const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      const success = await clipboardHelper.copy(textToCopy);
      
      if (success) {
        setCopySuccess(path);
        setTimeout(() => setCopySuccess(null), 2000);
      } else {
        const errorInfo = errorHandler.getClipboardError(new Error('Copy failed'));
        setError(errorInfo.message);
      }
    } catch (err) {
      const errorInfo = errorHandler.getClipboardError(err);
      setError(errorInfo.message);
    }
  }, []);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Handle mouse move for resizing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Constrain between 20% and 80%
    const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
    setPersistentState({ leftWidth: constrainedWidth });
  }, [isResizing, setPersistentState]);

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add event listeners for mouse events
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Get type-specific styling
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'string': return 'text-green-600 dark:text-green-400';
      case 'number': return 'text-blue-600 dark:text-blue-400';
      case 'boolean': return 'text-purple-600 dark:text-purple-400';
      case 'null': return 'text-gray-500 dark:text-gray-400';
      case 'object': return 'text-orange-600 dark:text-orange-400';
      case 'array': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-900 dark:text-gray-100';
    }
  };

  // Get type badge variant
  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'object': return 'default';
      case 'array': return 'destructive';
      case 'string': return 'secondary';
      default: return 'outline';
    }
  };

  // Memoized tree node component for better performance
  const TreeNodeComponent = React.memo<{
    node: TreeNode;
    depth: number;
    isExpanded: boolean;
    onToggle: (path: string) => void;
    onCopy: (value: any, path: string) => void;
    copySuccess: string | null;
  }>(({ node, depth, isExpanded, onToggle, onCopy, copySuccess }) => {
    const hasChildren = node.children && node.children.length > 0;
    const indentClass = `ml-${Math.min(depth * 4, 16)}`;

    return (
      <div className={`${depth > 0 ? indentClass : ''}`}>
        <div className="flex items-center gap-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2">
          {node.isExpandable ? (
            <Collapsible open={isExpanded} onOpenChange={() => onToggle(node.path)}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          ) : (
            <div className="w-6" />
          )}

          <span className="font-medium text-gray-700 dark:text-gray-300 font-mono" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
            {node.key}:
          </span>

          <Badge variant={getTypeBadgeVariant(node.type)} className="text-xs">
            {node.type}
          </Badge>

          <span className={`font-mono text-sm ${getTypeColor(node.type)}`} style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
            {node.type === 'string' ? `"${node.value}"` :
             node.type === 'null' ? 'null' :
             node.type === 'object' ? `{${Object.keys(node.value).length} keys}` :
             node.type === 'array' ? `[${node.value.length} items]` :
             String(node.value)}
          </span>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-auto"
            onClick={() => onCopy(node.value, node.path)}
          >
            <Copy className="h-3 w-3" />
          </Button>

          {copySuccess === node.path && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Copied!
            </span>
          )}
        </div>

        {node.isExpandable && (
          <Collapsible open={isExpanded}>
            <CollapsibleContent>
              <div className="border-l border-gray-200 dark:border-gray-700 ml-3">
                {hasChildren && node.children!.map(child => 
                  <TreeNodeComponent
                    key={child.path}
                    node={child}
                    depth={depth + 1}
                    isExpanded={expandedNodes.has(child.path)}
                    onToggle={toggleNode}
                    onCopy={copyToClipboard}
                    copySuccess={copySuccess}
                  />
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  });

  // Render tree node
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    return (
      <TreeNodeComponent
        key={node.path}
        node={node}
        depth={depth}
        isExpanded={expandedNodes.has(node.path)}
        onToggle={toggleNode}
        onCopy={copyToClipboard}
        copySuccess={copySuccess}
      />
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* Input Section */}
        <div 
          className={`flex flex-col border-r border-gray-200 dark:border-gray-700 ${!isResizing ? 'transition-all duration-75' : ''}`}
          style={{ width: `${leftWidth}%` }}
        >
          <Card className="flex-1 flex flex-col border-0 rounded-none shadow-none">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  JSON Input
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const shareableURL = generateShareableURL('/json-visualizer', persistentState);
                      await clipboardHelper.copy(shareableURL);
                      setCopySuccess('share-url');
                      setTimeout(() => setCopySuccess(null), 2000);
                    } catch (err) {
                      const errorInfo = errorHandler.getClipboardError(err);
                      setError(errorInfo.message);
                    }
                  }}
                  disabled={!input}
                  title="Copy shareable URL"
                >
                  <Share className="h-4 w-4" />
                  {copySuccess === 'share-url' ? 'Copied!' : 'Share'}
                </Button>
              </div>
              <CardDescription>
                Paste your JSON data to visualize it as an interactive tree structure
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <Textarea
                placeholder="Paste your JSON data here..."
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                className="flex-1 font-mono text-sm resize-none"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
                disabled={isProcessing}
              />
              
              {/* Processing State */}
              {isProcessing && (
                <Alert className="flex-shrink-0">
                  <AlertDescription>
                    Processing large JSON file...
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Performance Warning */}
              {performanceWarning && (
                <Alert variant="default" className="flex-shrink-0 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    {performanceWarning}
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive" className="flex-shrink-0">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resize Handle */}
        <div 
          className={`w-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-col-resize flex items-center justify-center group transition-colors select-none ${isResizing ? 'bg-gray-300 dark:bg-gray-600' : ''}`}
          onMouseDown={handleMouseDown}
          style={{ userSelect: 'none' }}
        >
          <GripVertical className={`h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 ${isResizing ? 'text-gray-600 dark:text-gray-300' : ''}`} />
        </div>

        {/* Visualizer Section */}
        <div 
          className={`flex flex-col ${!isResizing ? 'transition-all duration-75' : ''}`}
          style={{ width: `${100 - leftWidth}%` }}
        >
          <Card className="flex-1 flex flex-col border-0 rounded-none shadow-none">
            <CardHeader className="flex-shrink-0">
              <CardTitle>JSON Tree Visualizer</CardTitle>
              <CardDescription>
                Interactive tree view with expandable nodes and copy functionality
              </CardDescription>
              {parsedData && (
                <div className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="Search keys, values, or paths..."
                    value={searchTerm}
                    onChange={(e) => setPersistentState({ searchTerm: e.target.value })}
                    className="max-w-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (treeData) {
                        const allPaths = new Set<string>();
                        const collectPaths = (nodes: TreeNode[]) => {
                          nodes.forEach(node => {
                            if (node.isExpandable) {
                              allPaths.add(node.path);
                            }
                            if (node.children) {
                              collectPaths(node.children);
                            }
                          });
                        };
                        collectPaths(treeData);
                        setPersistentState({ expandedNodes: Array.from(allPaths) });
                      }
                    }}
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPersistentState({ expandedNodes: [] })}
                  >
                    Collapse All
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {!parsedData ? (
                <div className="h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                  <div>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter valid JSON data to see the tree visualization</p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 font-mono" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                  {filteredTreeData && filteredTreeData.length > 0 ? (
                    filteredTreeData.map(node => renderTreeNode(node))
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No matches found for "{searchTerm}"</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Wrapper component with error boundary
const JSONVisualizer: React.FC = () => {
  const handleRetry = () => {
    // Force re-render by updating key
    window.location.reload();
  };

  const handleGoBack = () => {
    window.location.hash = '#/home';
  };

  return (
    <ToolErrorBoundary 
      toolName="JSON Visualizer"
      onRetry={handleRetry}
      onGoBack={handleGoBack}
    >
      <JSONVisualizerCore />
    </ToolErrorBoundary>
  );
};

export default JSONVisualizer;