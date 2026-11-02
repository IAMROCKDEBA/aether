export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px]" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-12 w-56 rounded-2xl sm:h-14" />
      <div className="skeleton mt-3 h-4 w-64 rounded-lg" />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="rounded-[26px] border border-line bg-surface p-2.5">
            <div className="skeleton aspect-[4/3] rounded-[19px]" />
            <div className="skeleton mt-3 h-4 w-3/4 rounded-md" />
            <div className="skeleton mt-2 mb-1 h-3 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
