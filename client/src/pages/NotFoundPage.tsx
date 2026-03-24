import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="bg-background">
      <main className="max-w-2xl md:max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text mb-4">Page not found</h1>
        <p className="text-text-secondary mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/habits"
          className="text-pink-500 hover:text-pink-600 font-medium text-sm"
        >
          Go to habits
        </Link>
      </main>
    </div>
  );
}
