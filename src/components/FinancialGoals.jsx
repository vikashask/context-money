import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "../db";
import { getCurrencySymbol, useStore } from "../store";
import { formatAmount } from "../utils";

function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color = "#e85d50",
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset =
    circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-100 dark:text-dark-border"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="progress-ring-circle"
      />
    </svg>
  );
}

const GOAL_ICONS = ["🎯", "🏠", "✈️", "🚗", "📱", "💍", "🎓", "🏖️", "💰", "🎮"];
const GOAL_COLORS = [
  "#e85d50",
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
];

export default function FinancialGoals() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [goalIcon, setGoalIcon] = useState("🎯");
  const [goalColor, setGoalColor] = useState("#e85d50");
  const [addingAmount, setAddingAmount] = useState(null);
  const [addAmount, setAddAmount] = useState("");

  const goals = useLiveQuery(
    () =>
      activeContextId
        ? db.table("goals").where("contextId").equals(activeContextId).toArray()
        : [],
    [activeContextId],
  );

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !goalTarget || !activeContextId) return;
    await db.table("goals").add({
      contextId: activeContextId,
      name: goalName,
      targetAmount: Number(goalTarget),
      savedAmount: Number(goalSaved) || 0,
      icon: goalIcon,
      color: goalColor,
      createdAt: new Date(),
    });
    setGoalName("");
    setGoalTarget("");
    setGoalSaved("");
    setGoalIcon("🎯");
    setShowAddGoal(false);
  };

  const handleAddToGoal = async (goalId) => {
    if (!addAmount) return;
    const goal = goals?.find((g) => g.id === goalId);
    if (!goal) return;
    await db.table("goals").update(goalId, {
      savedAmount: goal.savedAmount + Number(addAmount),
    });
    setAddAmount("");
    setAddingAmount(null);
  };

  const handleDeleteGoal = async (goalId) => {
    await db.table("goals").delete(goalId);
  };

  if (!goals) return null;

  return (
    <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/80 dark:border-dark-border card-elevated animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-navy dark:text-dark-text">
          Savings Goals
        </h3>
        <button
          onClick={() => setShowAddGoal(true)}
          className="text-xs font-semibold text-coral hover:text-coral-light transition-colors px-2.5 py-1 rounded-lg hover:bg-coral/5"
        >
          + New Goal
        </button>
      </div>

      {goals.length === 0 && !showAddGoal && (
        <div className="text-center py-6">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-sm text-gray-500 dark:text-dark-muted mb-3">
            No savings goals yet
          </p>
          <button
            onClick={() => setShowAddGoal(true)}
            className="text-xs font-medium text-coral hover:text-coral-light"
          >
            Create your first goal
          </button>
        </div>
      )}

      {/* Goals List */}
      <div className="space-y-3">
        {goals.map((goal) => {
          const progress =
            goal.targetAmount > 0
              ? (goal.savedAmount / goal.targetAmount) * 100
              : 0;
          const isComplete = progress >= 100;

          return (
            <div
              key={goal.id}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                isComplete
                  ? "bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30"
                  : "bg-gray-50/50 dark:bg-dark/50 border-gray-100 dark:border-dark-border"
              }`}
            >
              {/* Progress Ring */}
              <div className="relative flex-shrink-0">
                <ProgressRing
                  progress={progress}
                  size={56}
                  strokeWidth={5}
                  color={goal.color}
                />
                <span className="absolute inset-0 flex items-center justify-center text-lg">
                  {isComplete ? "✅" : goal.icon}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-navy dark:text-dark-text truncate">
                    {goal.name}
                  </p>
                  {isComplete && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                      DONE!
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5">
                  <span className="font-mono-amount font-medium">
                    {formatAmount(goal.savedAmount, sym)}
                  </span>
                  {" / "}
                  <span className="font-mono-amount">
                    {formatAmount(goal.targetAmount, sym)}
                  </span>
                </p>
                <p className="text-[10px] text-gray-400 dark:text-dark-muted mt-0.5">
                  {progress.toFixed(0)}% complete •{" "}
                  {formatAmount(goal.targetAmount - goal.savedAmount, sym)}{" "}
                  remaining
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                {addingAmount === goal.id ? (
                  <div className="flex items-center gap-1 animate-scale-in">
                    <input
                      type="number"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      className="w-16 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark text-navy dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-coral/40"
                      placeholder="0"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddToGoal(goal.id)}
                      className="text-xs px-2 py-1 bg-coral text-white rounded-lg"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setAddingAmount(null)}
                      className="text-xs px-1.5 py-1 text-gray-400"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {!isComplete && (
                      <button
                        onClick={() => {
                          setAddingAmount(goal.id);
                          setAddAmount("");
                        }}
                        className="text-xs px-2.5 py-1 bg-coral/10 text-coral rounded-lg font-medium hover:bg-coral/20 transition-colors"
                      >
                        + Add
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-xs px-2 py-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Goal Form */}
      {showAddGoal && (
        <form
          onSubmit={handleAddGoal}
          className="mt-4 p-4 rounded-xl border border-coral/20 bg-coral/5 dark:bg-coral/5 animate-scale-in space-y-3"
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Goal name (e.g., New iPhone)"
                className="w-full text-sm px-3 py-2 rounded-lg bg-white dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                autoFocus
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 dark:text-dark-muted">
                Target Amount
              </label>
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="50000"
                className="w-full text-sm px-3 py-2 rounded-lg bg-white dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40 font-mono-amount"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 dark:text-dark-muted">
                Already Saved
              </label>
              <input
                type="number"
                value={goalSaved}
                onChange={(e) => setGoalSaved(e.target.value)}
                placeholder="0"
                className="w-full text-sm px-3 py-2 rounded-lg bg-white dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40 font-mono-amount"
              />
            </div>
          </div>
          {/* Icon picker */}
          <div>
            <label className="text-[10px] text-gray-500 dark:text-dark-muted">
              Icon & Color
            </label>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex gap-1">
                {GOAL_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setGoalIcon(icon)}
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all ${goalIcon === icon ? "bg-coral/20 ring-2 ring-coral scale-110" : "hover:bg-gray-100 dark:hover:bg-dark-border"}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGoalColor(c)}
                    className={`w-5 h-5 rounded-full transition-all ${goalColor === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-gradient-to-r from-coral to-[#f7a072] text-white rounded-lg text-sm font-medium"
            >
              Create Goal
            </button>
            <button
              type="button"
              onClick={() => setShowAddGoal(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
