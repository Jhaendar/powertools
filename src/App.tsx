import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToolRegistryProvider, useToolRegistry } from './contexts/ToolRegistryContext';
import { Layout } from './components/Layout/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Code2, FileText, Table } from 'lucide-react';
import './App.css';

// Enhanced home component with tool overview
const Home = () => {
  const toolRegistry = useToolRegistry();
  const tools = toolRegistry.getAllTools();

  const getToolIcon = (toolId: string) => {
    switch (toolId) {
      case 'json-converter':
        return <Code2 className="h-8 w-8" />;
      case 'json-visualizer':
        return <FileText className="h-8 w-8" />;
      case 'csv-viewer':
        return <Table className="h-8 w-8" />;
      default:
        return <Code2 className="h-8 w-8" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Dev Tools Website</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A collection of useful developer tools built with React, Vite, and shadcn/ui. 
          Choose a tool from the sidebar or explore the available options below.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Card key={tool.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                {getToolIcon(tool.id)}
              </div>
              <CardTitle>{tool.name}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={`#${tool.path}`}
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Open Tool
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Loading component with better styling
const LoadingFallback: React.FC<{ toolName: string }> = ({ toolName }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">Loading {toolName}...</p>
    </div>
  </div>
);

// Component to render dynamic routes based on tool registry
const DynamicRoutes: React.FC = () => {
  const toolRegistry = useToolRegistry();
  const tools = toolRegistry.getAllTools();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      {tools.map(tool => (
        <Route
          key={tool.id}
          path={tool.path}
          element={
            <Suspense fallback={<LoadingFallback toolName={tool.name} />}>
              <tool.component />
            </Suspense>
          }
        />
      ))}
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <ToolRegistryProvider>
        <Router>
          <Layout>
            <DynamicRoutes />
          </Layout>
        </Router>
      </ToolRegistryProvider>
    </ErrorBoundary>
  );
}

export default App;
