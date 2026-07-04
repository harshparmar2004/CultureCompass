import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock the fetch API
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as any;

describe('CultureCompass App', () => {
  it('renders the initial welcome screen', () => {
    render(<App />);
    expect(screen.getByText('Welcome to CultureCompass')).toBeInTheDocument();
    expect(screen.getByText(/Where is your next adventure taking you/i)).toBeInTheDocument();
  });

  it('renders the search form inputs', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/e.g. Kyoto, Japan/i)).toBeInTheDocument();
    expect(screen.getByText('Discover Around Me')).toBeInTheDocument();
  });

  it('shows validation alert if no location is entered', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<App />);
    
    const searchButton = screen.getByText('Discover Around Me');
    fireEvent.click(searchButton);
    
    expect(alertMock).toHaveBeenCalledWith('Please enter your current location.');
    alertMock.mockRestore();
  });
});
