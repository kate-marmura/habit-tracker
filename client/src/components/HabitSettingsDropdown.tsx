import { useState, useRef, useEffect } from 'react';

interface Props {
  onEdit: () => void;
  onArchive?: () => void;
}

export default function HabitSettingsDropdown({ onEdit, onArchive }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Habit settings"
        aria-expanded={open}
        aria-haspopup="menu"
        className="p-2 rounded-lg border border-border text-text-secondary hover:bg-gray-100 transition text-sm"
      >
        ⋯
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-40 bg-surface rounded-lg border border-border shadow-lg z-10"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className={`w-full text-left px-4 py-2.5 text-sm text-text hover:bg-gray-50 transition ${onArchive ? 'rounded-t-lg' : 'rounded-lg'}`}
          >
            Edit
          </button>
          {onArchive && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition rounded-b-lg"
            >
              Archive
            </button>
          )}
        </div>
      )}
    </div>
  );
}
