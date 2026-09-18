export default function ModelDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:px-6">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="aspect-square w-full rounded-card bg-surface-alt" />
          <div className="mt-4 flex gap-3">
            <div className="h-20 w-20 rounded-control bg-surface-alt" />
            <div className="h-20 w-20 rounded-control bg-surface-alt" />
          </div>
        </div>
        <div>
          <div className="h-6 w-40 rounded-full bg-surface-alt" />
          <div className="mt-4 h-9 w-3/4 rounded bg-surface-alt" />
          <div className="mt-6 h-32 w-full rounded-card bg-surface-alt" />
        </div>
      </div>
    </div>
  );
}
