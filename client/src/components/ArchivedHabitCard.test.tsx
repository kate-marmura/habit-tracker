import { render, screen } from '@testing-library/react';
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

function renderCard(habit = mockHabit) {
  return render(
    <MemoryRouter>
      <ul>
        <ArchivedHabitCard habit={habit} />
      </ul>
    </MemoryRouter>,
  );
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
    expect(screen.getByText(/started 2025-06-01/i)).toBeInTheDocument();
  });

  it('hides description when null', () => {
    renderCard({ ...mockHabit, description: null });
    expect(screen.queryByText('No longer active')).not.toBeInTheDocument();
  });
});
