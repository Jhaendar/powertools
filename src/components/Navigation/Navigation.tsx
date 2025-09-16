import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Home, Code2 } from 'lucide-react';
import { useToolRegistry } from '../../contexts/ToolRegistryContext';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';

export const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const toolRegistry = useToolRegistry();
  const tools = toolRegistry.getAllTools();

  const isActive = (path: string) => {
    return location.pathname === path || location.hash === `#${path}`;
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

  const navigationItems = (
    <>
      <NavLink to="/home" onClick={() => setIsOpen(false)}>
        <Home className="h-4 w-4" />
        Home
      </NavLink>
      
      <Separator className="my-2" />
      
      <div className="space-y-1">
        <div className="px-3 py-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Tools</h4>
        </div>
        {tools.map((tool) => (
          <NavLink key={tool.id} to={tool.path} onClick={() => setIsOpen(false)}>
            <Code2 className="h-4 w-4" />
            {tool.name}
          </NavLink>
        ))}
      </div>
    </>
  );

  return (
    <nav className="flex items-center justify-between px-4 py-3 md:px-6">
      {/* Logo/Brand */}
      <Link 
        to="/home" 
        className="flex items-center gap-2 font-bold text-lg hover:text-primary transition-colors"
      >
        <Code2 className="h-6 w-6" />
        <span className="hidden sm:inline">Dev Tools</span>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-1">
        <NavLink to="/home">
          <Home className="h-4 w-4" />
          Home
        </NavLink>
        
        {tools.map((tool) => (
          <NavLink key={tool.id} to={tool.path}>
            <Code2 className="h-4 w-4" />
            {tool.name}
          </NavLink>
        ))}
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Dev Tools
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-1">
              {navigationItems}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default Navigation;