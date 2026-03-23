import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HabitCard from './HabitCard';
import type { Habit } from '../types/habit';

const mockHabit: Habit = {
  id: '1',
  name: 'Exercise',
  description: 'Daily workout',
  startDate: '2026-03-01',
  isArchived: false,
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedAt: '2026-03-01T12:00:00.000Z',
};

function renderCard(props?: Partial<{ onEdit: (h: Habit) => void; onArchive: (h: Habit) => void; onDelete: (h: Habit) => void }>) {
  const defaults = {
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  return {
    ...render(
      <MemoryRouter>
        <ul>
          <HabitCard habit={mockHabit} {...merged} />
        </ul>
      </MemoryRouter>,
    ),
    ...merged,
  };
}

describe('HabitCard', () => {
  it('renders habit name as a link', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /view calendar for exercise/i });
    expect(link).toHaveAttribute('href', '/habits/1');
  });

  it('has View icon button linking to /habits/:id', () => {
    renderCard();
    const viewLink = screen.getByRole('link', { name: /^view exercise$/i });
    expect(viewLink).toHaveAttribute('href', '/habits/1');
  });

  it('has Edit icon button that calls onEdit', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    renderCard({ onEdit });

    await user.click(screen.getByRole('button', { name: /edit exercise/i }));
    expect(onEdit).toHaveBeenCalledWith(mockHabit);
  });

  it('has Archive icon button that calls onArchive', async () => {
    const onArchive = vi.fn();
    const user = userEvent.setup();
    renderCard({ onArchive });

    await user.click(screen.getByRole('button', { name: /archive exercise/i }));
    expect(onArchive).toHaveBeenCalledWith(mockHabit);
  });

  it('has Delete icon button that calls onDelete', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderCard({ onDelete });

    await user.click(screen.getByRole('button', { name: /delete exercise/i }));
    expect(onDelete).toHaveBeenCalledWith(mockHabit);
  });

  it('shows description and start date', () => {
    renderCard();
    expect(screen.getByText('Daily workout')).toBeInTheDocument();
    expect(screen.getByText(/started 2026-03-01/i)).toBeInTheDocument();
  });
});
