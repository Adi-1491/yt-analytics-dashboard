"use client";
export function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border p-4 animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-700/50 rounded" />
      ))}
    </div>
  );
}
