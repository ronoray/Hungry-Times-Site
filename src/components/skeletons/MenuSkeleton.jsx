export default function MenuSkeleton() {
  return (
    <div className="px-4 pt-20 pb-24 animate-pulse">
      {/* Search bar placeholder */}
      <div className="h-10 bg-ht-paper rounded-xl mb-4 max-w-lg mx-auto" />

      {/* Category pills */}
      <div className="flex gap-2 overflow-hidden mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-20 bg-ht-paper rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Subcategory pills */}
      <div className="flex gap-2 overflow-hidden mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-7 w-24 bg-ht-paper rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Item cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-ht-paper rounded-2xl p-3 space-y-2">
            <div className="h-3 w-3/4 bg-ht-ink/10 rounded" />
            <div className="h-2.5 w-1/2 bg-ht-ink/10 rounded" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-4 w-14 bg-ht-ink/10 rounded" />
              <div className="h-7 w-16 bg-ht-ink/10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
