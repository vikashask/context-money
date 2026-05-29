import Achievements from "../components/Achievements";
import FinancialGoals from "../components/FinancialGoals";
import SpendingHeatmap from "../components/SpendingHeatmap";

export default function Goals() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="mb-2">
        <h1 className="text-xl font-heading font-bold text-navy dark:text-white">
          Goals & Streaks
        </h1>
        <p className="text-sm text-gray-500 dark:text-dark-muted mt-0.5">
          Track your savings goals and daily habits
        </p>
      </div>

      <Achievements />
      <FinancialGoals />
      <SpendingHeatmap />
    </div>
  );
}
