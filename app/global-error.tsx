'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8 text-center">
          <div className="text-5xl mb-4">💥</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong!</h2>
          <p className="text-gray-500 mb-6">{error.message}</p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
