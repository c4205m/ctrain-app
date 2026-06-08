import { create } from "zustand";
import { persist } from "zustand/middleware";

export const STAT_KEYS = [
  "streak",
  "weeklySets",
  "weeklyVolume",
  "monthlyPRs",
  "activeExercises",
  "daysSinceLastLog",
  "mostTrainedMuscle",
  "mostNeglectedMuscle",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  streak: "Streak",
  weeklySets: "Weekly Sets",
  weeklyVolume: "Weekly Volume",
  monthlyPRs: "Monthly PRs",
  activeExercises: "Active Exercises",
  daysSinceLastLog: "Days Since Last Log",
  mostTrainedMuscle: "Most Trained Muscle",
  mostNeglectedMuscle: "Most Neglected Muscle",
};

interface SettingsState {
  visibleStats: Record<StatKey, boolean>;
  setStatVisible: (key: StatKey, visible: boolean) => void;
}

const DEFAULT_VISIBLE = Object.fromEntries(
  STAT_KEYS.map((k) => [k, true])
) as Record<StatKey, boolean>;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      visibleStats: DEFAULT_VISIBLE,
      setStatVisible: (key, visible) =>
        set((s) => ({ visibleStats: { ...s.visibleStats, [key]: visible } })),
    }),
    { name: "ctrain-settings" }
  )
);
