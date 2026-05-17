import { useCallback, useEffect, useRef, useState } from "react";

// Lightweight virtual list for 1000+ items
// Renders only visible items + buffer
export default function VirtualList({
  items,
  itemHeight = 56,
  renderItem,
  overscan = 5,
  className = "",
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = [];
  for (let i = startIndex; i < endIndex; i++) {
    visibleItems.push(
      <div
        key={i}
        style={{
          position: "absolute",
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(items[i], i)}
      </div>,
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ position: "relative" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems}
      </div>
    </div>
  );
}
