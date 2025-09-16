import { describe, it, expect, beforeEach } from 'vitest';
import { generateShareableURL, parseSharedURL } from '../statePersistence';

describe('State Persistence Utilities', () => {
  beforeEach(() => {
    // Mock window.location for tests
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
        pathname: '/dev-tools-website/',
      },
      writable: true,
    });
  });

  describe('generateShareableURL', () => {
    it('should generate a shareable URL with encoded state', () => {
      const toolPath = '/json-converter';
      const state = {
        input: '{"name": "John", "age": 30}',
        isFormatted: true,
        outerDelimiter: '"'
      };

      const url = generateShareableURL(toolPath, state);
      
      expect(url).toContain('http://localhost:3000/dev-tools-website/');
      expect(url).toContain('json-converter');
      expect(url).toContain('state=');
    });

    it('should handle empty state', () => {
      const toolPath = '/json-converter';
      const state = {};

      const url = generateShareableURL(toolPath, state);
      
      expect(url).toContain('http://localhost:3000/dev-tools-website/');
      expect(url).toContain('json-converter');
    });
  });

  describe('parseSharedURL', () => {
    it('should parse a shared URL with state', () => {
      const url = 'http://localhost:3000/dev-tools-website/#/json-converter?state=eyJpbnB1dCI6IntcIm5hbWVcIjogXCJKb2huXCIsIFwiYWdlXCI6IDMwfSIsImlzRm9ybWF0dGVkIjp0cnVlLCJvdXRlckRlbGltaXRlciI6IlwiIn0%3D';
      
      const result = parseSharedURL(url);
      
      expect(result.toolPath).toContain('json-converter');
      expect(result.state).toBeDefined();
    });

    it('should handle URL without state', () => {
      const url = 'http://localhost:3000/dev-tools-website/#/json-converter';
      
      const result = parseSharedURL(url);
      
      expect(result.toolPath).toBe('/json-converter');
      expect(result.state).toBeNull();
    });

    it('should handle invalid URLs gracefully', () => {
      const url = 'invalid-url';
      
      const result = parseSharedURL(url);
      
      expect(result.toolPath).toBe('');
      expect(result.state).toBeNull();
    });
  });
});