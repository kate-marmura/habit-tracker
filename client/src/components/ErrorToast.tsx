import { useEffect } from 'react';

interface Props {
  message: string | null;
  onDismiss: () => void;
}

export default function ErrorToast({ message, onDismiss }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50"
      role="alert"
      aria-live="assertive"
    >
      {message}
    </div>
  );
}
