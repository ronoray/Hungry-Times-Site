export default function OrdersSkeleton() {
  return (
    <div className="px-4 pt-20 pb-24 animate-pulse max-w-2xl mx-auto">
      <div className="h-7 w-32 bg-gray-800 rounded mb-6" />

      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-gray-700 rounded" />
              <div className="h-5 w-20 bg-yellow-500/20 rounded-full" />
            </div>
            <div className="h-3 w-48 bg-gray-700/60 rounded" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-3.5 w-20 bg-gray-700 rounded" />
              <div className="h-3 w-16 bg-gray-700/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
