export default function OrdersSkeleton() {
  return (
    <div className="px-4 pt-20 pb-24 animate-pulse max-w-2xl mx-auto">
      <div className="h-7 w-32 bg-ht-paper rounded mb-6" />

      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-ht-paper rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-ht-ink/10 rounded" />
              <div className="h-5 w-20 bg-ht-gold2/60 rounded-full" />
            </div>
            <div className="h-3 w-48 bg-ht-ink/10 rounded" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-3.5 w-20 bg-ht-ink/10 rounded" />
              <div className="h-3 w-16 bg-ht-ink/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
