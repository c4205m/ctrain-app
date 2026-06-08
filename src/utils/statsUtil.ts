import type { Exercise } from "../db/db";
import { computeScores } from "./displayUtil";
import { slugToTitle } from "./displayUtil";

function daysAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
}

function withinDays(dateStr: string | undefined, days: number): boolean {
  if (!dateStr) return false;
  return daysAgo(dateStr) <= days;
}

export function computeStreak(exercises: Exercise[]): number {
  const loggedDays = new Set<string>();
  for (const ex of exercises) {
    if (ex.latestLog?.date) {
      loggedDays.add(new Date(ex.latestLog.date).toDateString());
    }
  }
  let streak = 0;
  const cursor = new Date();
  // if nothing logged today, start checking from yesterday
  if (!loggedDays.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (loggedDays.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeWeeklySets(exercises: Exercise[]): number {
  return exercises.reduce((sum, ex) => {
    if (!withinDays(ex.latestLog?.date, 7)) return sum;
    return sum + (ex.latestLog?.sets ?? 0);
  }, 0);
}

export function computeWeeklyVolume(exercises: Exercise[]): number {
  return exercises.reduce((sum, ex) => {
    if (!withinDays(ex.latestLog?.date, 7)) return sum;
    const log = ex.latestLog!;
    const w = log.setType === "rep"
      ? (log.bodyweight ? Math.max(log.weight, 1) : log.weight)
      : 1;
    return sum + log.sets * log.effortPerSet * w;
  }, 0);
}

export function computeMonthlyPRs(exercises: Exercise[]): number {
  return exercises.filter((ex) => withinDays(ex.highestLog?.date, 30)).length;
}

export function computeActiveExercises(exercises: Exercise[]): number {
  return exercises.filter((ex) => ex.latestLog != null).length;
}

export function computeDaysSinceLastLog(exercises: Exercise[]): number | null {
  const logged = exercises
    .map((ex) => ex.latestLog?.date)
    .filter(Boolean) as string[];
  if (logged.length === 0) return null;
  const mostRecent = Math.min(...logged.map((d) => daysAgo(d)));
  return Math.floor(mostRecent);
}

export function computeMostTrainedMuscle(exercises: Exercise[]): string | null {
  const scores = computeScores(exercises);
  const entries = Object.entries(scores) as [string, number][];
  if (entries.length === 0) return null;
  const best = entries.reduce((a, b) => (a[1] < b[1] ? a : b));
  return slugToTitle(best[0]);
}

export function computeMostNeglectedMuscle(exercises: Exercise[]): string | null {
  const scores = computeScores(exercises);
  const entries = (Object.entries(scores) as [string, number][]).filter(
    ([, v]) => v > 0
  );
  if (entries.length === 0) return null;
  const worst = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  return slugToTitle(worst[0]);
}

export function computeMuscleCoverage(exercises: Exercise[]): string {
  const scores = computeScores(exercises);
  const trained = Object.values(scores).filter((v) => v !== undefined && v < 30).length;
  return `${Math.round((trained / 20) * 100)}%`;
}
