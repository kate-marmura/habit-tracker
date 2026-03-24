interface Props {
  message: string | null;
  onUndo: () => void;
}

export default function UndoToast({ message, onUndo }: Props) {
  if (!message) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm z-50 flex items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="text-pink-300 font-semibold hover:text-white transition"
      >
        Undo
      </button>
    </div>
  );
}
