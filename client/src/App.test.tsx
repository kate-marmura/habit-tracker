import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

function renderWithProviders(initialRoute = '/habits') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('renders without crashing', () => {
    renderWithProviders();
    expect(screen.getByText('Habbit Tracker')).toBeInTheDocument();
  });
});
