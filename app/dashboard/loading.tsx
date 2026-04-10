export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar skeleton */}
      <div className="h-16 bg-white border-b border-gray-200" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-5 w-48 bg-gray-200 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse mt-3" />
              <div className="flex gap-3 mt-4">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex -space-x-2 mt-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-8 w-8 rounded-full bg-gray-200 animate-pulse ring-2 ring-white" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
