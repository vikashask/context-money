import { useState } from "react";

export default function TagInput({ value = [], onChange, suggestions = [] }) {
  const [input, setInput] = useState("");

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const filteredSuggestions =
    input.length > 0
      ? suggestions
          .filter(
            (s) =>
              s.toLowerCase().includes(input.toLowerCase()) &&
              !value.includes(s.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border min-h-[44px]">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-coral/10 text-coral text-xs rounded-full"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-coral/60 hover:text-coral text-xs"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Add tags..." : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-navy dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-muted focus:outline-none"
        />
      </div>
      {filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-dark-border text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
