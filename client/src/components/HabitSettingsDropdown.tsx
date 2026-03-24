import { useState, useRef, useEffect } from 'react';

interface Props {
  onEdit?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
}

export default function HabitSettingsDropdown({ onEdit, onArchive, onUnarchive, onDelete }: Props) {
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
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-gray-50 transition first:rounded-t-lg last:rounded-b-lg"
            >
              Edit
            </button>
          )}
          {onUnarchive && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onUnarchive();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-gray-50 transition first:rounded-t-lg last:rounded-b-lg"
            >
              Unarchive
            </button>
          )}
          {onArchive && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-pink-600 hover:bg-pink-50 transition first:rounded-t-lg last:rounded-b-lg"
            >
              Archive
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-pink-600 hover:bg-pink-50 transition first:rounded-t-lg last:rounded-b-lg"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
