import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('renders "Page not found" heading', () => {
    renderPage();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('contains a link to /habits', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /go to habits/i });
    expect(link).toHaveAttribute('href', '/habits');
  });

  it('shows a helpful description', () => {
    renderPage();
    expect(screen.getByText(/doesn't exist or has been moved/i)).toBeInTheDocument();
  });
});
