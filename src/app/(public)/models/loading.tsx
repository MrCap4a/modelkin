export default function CatalogLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:px-6">
      <div className="h-9 w-64 rounded bg-surface-alt" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-surface-alt" />
      <div className="mt-6 h-12 w-full rounded-control bg-surface-alt" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-surface-alt" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-card border border-border">
            <div className="aspect-[4/3] w-full bg-surface-alt" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/2 rounded bg-surface-alt" />
              <div className="h-4 w-3/4 rounded bg-surface-alt" />
              <div className="h-5 w-1/3 rounded bg-surface-alt" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
