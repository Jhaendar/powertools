import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Home, Code2, FileText, Table, X } from 'lucide-react';
import { useToolRegistry } from '../../contexts/ToolRegistryContext';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const toolRegistry = useToolRegistry();
  const toolsByCategory = toolRegistry.getToolsByCategory();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(toolsByCategory))
  );

  const isActive = (path: string) => {
    return location.pathname === path || location.hash === `#${path}`;
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getToolIcon = (toolId: string) => {
    switch (toolId) {
      case 'json-converter':
        return <Code2 className="h-4 w-4" />;
      case 'json-visualizer':
        return <FileText className="h-4 w-4" />;
      case 'csv-viewer':
        return <Table className="h-4 w-4" />;
      default:
        return <Code2 className="h-4 w-4" />;
    }
  };

  const NavLink: React.FC<{ to: string; children: React.ReactNode; onClick?: () => void }> = ({ 
    to, 
    children, 
    onClick 
  }) => (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
        isActive(to)
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      {children}
    </Link>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Link 
          to="/home" 
          className="flex items-center gap-2 font-bold text-lg hover:text-primary transition-colors"
        >
          <Code2 className="h-6 w-6" />
          Dev Tools
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="lg:hidden"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Home Link */}
        <NavLink to="/home">
          <Home className="h-4 w-4" />
          Home
        </NavLink>
        
        <Separator className="my-4" />
        
        {/* Tool Categories */}
        <div className="space-y-2">
          {Object.entries(toolsByCategory).map(([category, tools]) => (
            <Collapsible
              key={category}
              open={expandedCategories.has(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-left rounded-md hover:bg-accent/50 transition-colors">
                <span>{category}</span>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 ml-2 mt-1">
                {tools.map((tool) => (
                  <NavLink key={tool.id} to={tool.path}>
                    {getToolIcon(tool.id)}
                    {tool.name}
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Built with React & Vite</p>
          <div className="flex gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <span>•</span>
            <a
              href="https://ui.shadcn.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              shadcn/ui
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-background border-r transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default Sidebar;