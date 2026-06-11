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
  "weight",
  "weightTracking",
  "height",
  "bmi",
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
  weight: "Weight",
  weightTracking: "Weight Tracking",
  height: "Height",
  bmi: "BMI",
};

interface SettingsState {
  visibleStats: Record<StatKey, boolean>;
  setStatVisible: (key: StatKey, visible: boolean) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: () => void;
  chipSearchEnabled: boolean;
  setChipSearchEnabled: (enabled: boolean) => void;
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
      onboardingComplete: false,
      setOnboardingComplete: () => set({ onboardingComplete: true }),
      chipSearchEnabled: false,
      setChipSearchEnabled: (enabled) => set({ chipSearchEnabled: enabled }),
    }),
    { name: "ctrain-settings" }
  )
);
