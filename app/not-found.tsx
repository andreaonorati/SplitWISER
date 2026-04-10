import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8 text-center">
      <div className="text-7xl mb-6">🗺️</div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-8 max-w-md">
        Looks like you took a wrong turn. This page doesn&apos;t exist.
      </p>
      <Link href="/dashboard" className="btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
