export default function DefaultSkeleton() {
  return (
    <div className="px-4 pt-20 pb-24 animate-pulse max-w-2xl mx-auto">
      <div className="h-8 w-48 bg-gray-800 rounded mb-6" />
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-800 rounded" />
        <div className="h-4 w-5/6 bg-gray-800 rounded" />
        <div className="h-4 w-4/6 bg-gray-800 rounded" />
      </div>
    </div>
  );
}
