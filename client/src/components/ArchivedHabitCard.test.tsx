import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ArchivedHabitCard from './ArchivedHabitCard';
import type { Habit } from '../types/habit';

const mockHabit: Habit = {
  id: '42',
  name: 'Old Habit',
  description: 'No longer active',
  startDate: '2025-06-01',
  isArchived: true,
  createdAt: '2025-06-01T12:00:00.000Z',
  updatedAt: '2026-01-15T12:00:00.000Z',
};

function renderCard(overrides?: Partial<{ onUnarchive: (h: Habit) => void; onDelete: (h: Habit) => void }>) {
  const defaults = {
    onUnarchive: vi.fn(),
    onDelete: vi.fn(),
  };
  const merged = { ...defaults, ...overrides };
  return {
    ...render(
      <MemoryRouter>
        <ul>
          <ArchivedHabitCard habit={mockHabit} {...merged} />
        </ul>
      </MemoryRouter>,
    ),
    ...merged,
  };
}

describe('ArchivedHabitCard', () => {
  it('renders habit name as a link to /habits/:id', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /view archived habit old habit/i });
    expect(link).toHaveAttribute('href', '/habits/42');
  });

  it('shows Archived badge', () => {
    renderCard();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('shows description when present', () => {
    renderCard();
    expect(screen.getByText('No longer active')).toBeInTheDocument();
  });

  it('shows start date', () => {
    renderCard();
    expect(screen.getByText(/started 1 june 2025/i)).toBeInTheDocument();
  });

  it('hides description when null', () => {
    render(
      <MemoryRouter>
        <ul>
          <ArchivedHabitCard habit={{ ...mockHabit, description: null }} onUnarchive={vi.fn()} onDelete={vi.fn()} />
        </ul>
      </MemoryRouter>,
    );
    expect(screen.queryByText('No longer active')).not.toBeInTheDocument();
  });

  it('has View icon button linking to /habits/:id', () => {
    renderCard();
    const viewLink = screen.getByRole('link', { name: /^view old habit$/i });
    expect(viewLink).toHaveAttribute('href', '/habits/42');
  });

  it('calls onUnarchive when Unarchive button is clicked', async () => {
    const onUnarchive = vi.fn();
    const user = userEvent.setup();
    renderCard({ onUnarchive });

    await user.click(screen.getByRole('button', { name: /unarchive old habit/i }));
    expect(onUnarchive).toHaveBeenCalledWith(mockHabit);
  });

  it('calls onDelete when Delete button is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderCard({ onDelete });

    await user.click(screen.getByRole('button', { name: /delete old habit/i }));
    expect(onDelete).toHaveBeenCalledWith(mockHabit);
  });
});
