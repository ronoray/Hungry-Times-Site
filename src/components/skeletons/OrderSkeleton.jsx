export default function OrderSkeleton() {
  return (
    <div className="px-4 pt-20 pb-24 animate-pulse max-w-2xl mx-auto">
      {/* Header */}
      <div className="h-7 w-32 bg-ht-paper rounded mb-6" />

      {/* Cart items */}
      <div className="space-y-3 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-ht-paper rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-ht-ink/10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 bg-ht-ink/10 rounded" />
              <div className="h-2.5 w-1/3 bg-ht-ink/10 rounded" />
            </div>
            <div className="h-4 w-14 bg-ht-ink/10 rounded" />
          </div>
        ))}
      </div>

      {/* Address section */}
      <div className="bg-ht-paper rounded-xl p-4 mb-4 space-y-2">
        <div className="h-4 w-32 bg-ht-ink/10 rounded" />
        <div className="h-10 w-full bg-ht-ink/10 rounded-lg" />
      </div>

      {/* Payment section */}
      <div className="bg-ht-paper rounded-xl p-4 space-y-3">
        <div className="h-4 w-28 bg-ht-ink/10 rounded" />
        <div className="flex gap-3">
          <div className="h-10 flex-1 bg-ht-ink/10 rounded-lg" />
          <div className="h-10 flex-1 bg-ht-ink/10 rounded-lg" />
        </div>
      </div>

      {/* Place order button */}
      <div className="h-12 w-full bg-ht-ink/10 rounded-xl mt-6" />
    </div>
  );
}
