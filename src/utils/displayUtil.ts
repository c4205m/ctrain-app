import { MuscleGroups, type MuscleGroup } from "../db/types";
import type { Exercise } from "../db/db";

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export const MUSCLE_COLOR = Object.fromEntries(
  Object.values(MuscleGroups).map(({ slug, color }) => [slug, color])
) as Record<string, string>;

export function computeScores(exercises: Exercise[]): Partial<Record<MuscleGroup, number>> {
  const now = Date.now();
  const scores: Partial<Record<MuscleGroup, number>> = {};
  for (const ex of exercises) {
    if (!ex.latestLog?.date) continue;
    const daysAgo = Math.max(0, (now - new Date(ex.latestLog.date).getTime()) / 86_400_000);
    for (const muscle of ex.muscles) {
      const prev = scores[muscle];
      if (prev === undefined || daysAgo < prev) scores[muscle] = daysAgo;
    }
  }
  return scores;
}

export const DIFFICULTY_BADGE: Record<string, { label: string; cls: string }> = {
  Beginner:     { label: "Easy", cls: "text-green-700" },
  Intermediate: { label: "Mid",  cls: "text-yellow-700" },
  Advanced:     { label: "Hard", cls: "text-red-700" },
};