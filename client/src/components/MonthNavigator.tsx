import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

export default function MonthNavigator({ year, month, onPrev, onNext, canGoNext }: Props) {
  const label = new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-center gap-4 mb-4">
      <button
        type="button"
        onClick={onPrev}
        className="p-2 rounded-lg hover:bg-gray-100 transition text-text-secondary"
        aria-label="Previous month"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-lg font-semibold text-text min-w-[180px] text-center">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="p-2 rounded-lg transition text-text-secondary hover:bg-gray-100 disabled:text-muted disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent"
        aria-label="Next month"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
