import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders dev tools website', () => {
    render(<App />);
    const welcomeElement = screen.getByText(/Dev Tools Website/i);
    expect(welcomeElement).toBeInTheDocument();
  });
});
