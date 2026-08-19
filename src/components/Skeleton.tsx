export function SkeletonCard() {
  return (
    <div className="stat-card bg-gradient-to-br from-gray-200 to-gray-100 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-white/40 rounded w-24" />
          <div className="h-8 bg-white/40 rounded w-32" />
          <div className="h-4 bg-white/40 rounded w-20" />
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-12 bg-gray-100 rounded-t-xl flex items-center px-5 gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="h-14 border-b border-gray-100 flex items-center px-5 gap-6">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="card overflow-hidden animate-pulse">
          <div className="px-5 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gray-200 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </div>
              </div>
              <div className="flex gap-1">
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 bg-gray-200 rounded w-48" />
        <div className="h-6 bg-gray-100 rounded-full w-16" />
      </div>
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );
}
