import { useRef, useState } from "react";

const THRESHOLD = 80;

export default function SwipeableRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = "Edit",
  rightLabel = "Delete",
  leftColor = "bg-blue-500",
  rightColor = "bg-red-500",
}) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!swiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    // Clamp to max ±120px with resistance
    const clamped = Math.sign(diff) * Math.min(Math.abs(diff) * 0.6, 120);
    setOffset(clamped);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offset > THRESHOLD && onSwipeRight) {
      onSwipeRight();
    } else if (offset < -THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
    }
    setOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl swipe-row">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div
          className={`flex items-center justify-start px-4 w-1/2 ${leftColor} text-white text-sm font-medium`}
        >
          {offset > 20 && `← ${leftLabel}`}
        </div>
        <div
          className={`flex items-center justify-end px-4 w-1/2 ${rightColor} text-white text-sm font-medium`}
        >
          {offset < -20 && `${rightLabel} →`}
        </div>
      </div>

      {/* Foreground content */}
      <div
        className="relative bg-white dark:bg-dark-card transition-transform duration-100"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
