import type { Exercise } from "../db/db";

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateDM(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric" 
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDateDM(iso);
}

export function estimateDuration(plan: any, exercises: Exercise[]): number {
  return plan.exercises.reduce((total: number, pe: { exerciseId: string; sets: number }) => {
    const ex = exercises.find(e => e.id === pe.exerciseId)
    const log = ex?.latestLog
    const timePerSet = log?.duration
    return total + pe.sets * (timePerSet ?? 120)
  }, 0)
}