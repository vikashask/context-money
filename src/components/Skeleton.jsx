export default function Skeleton({ className = "", count = 1 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 dark:bg-dark-border rounded-xl ${className}`}
        />
      ))}
    </div>
  );
}
