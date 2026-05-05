import Link from 'next/link';

export default function VersionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">SplitWISER Versions</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use stable URLs to compare UI versions on the same domain.
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Version 1</h2>
            <p className="mt-1 text-sm text-gray-600">Baseline route for original experience tests.</p>
            <div className="mt-3">
              <Link href="/v1" className="text-primary-600 hover:text-primary-700 font-medium">
                Open V1
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Version 2</h2>
            <p className="mt-1 text-sm text-gray-600">Figma-inspired redesign test route.</p>
            <div className="mt-3">
              <Link href="/v2" className="text-primary-600 hover:text-primary-700 font-medium">
                Open V2
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p>
            Future versions follow the same pattern: <span className="font-semibold">/v3</span>, <span className="font-semibold">/v4</span>, ...
          </p>
        </div>
      </div>
    </div>
  );
}
