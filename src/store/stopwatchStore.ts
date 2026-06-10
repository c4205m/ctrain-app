import { create } from "zustand";
import type { Plan, Exercise } from "../db/db";

export interface Lap {
  label: string;
  ms?: number;
  exerciseId?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  kind?: "exercise-done";
}

export interface PlanSession {
  plan: Plan;
  exercises: Exercise[];
}

interface StopwatchState {
  running: boolean;
  startedAt: number | null;
  baseElapsed: number;
  laps: Lap[];
  currentLabel: string;
  isComplete: boolean;
  exIdx: number;
  currentSet: number;
  lapStartBase: number;
  session: PlanSession | null;

  requestOpen: boolean;

  getElapsed: () => number;
  start: (label?: string) => void;
  pause: () => void;
  reset: () => void;
  recordLap: (label: string) => void;
  addExerciseDoneMarker: (marker: { label: string; exerciseId?: string; sets?: number; reps?: number; duration?: number }) => void;
  setCurrentLabel: (label: string) => void;
  setIsComplete: (v: boolean) => void;
  setExIdx: (fn: (i: number) => number) => void;
  setCurrentSet: (fn: (s: number) => number) => void;
  setSession: (session: PlanSession | null) => void;
  openWithSession: (session: PlanSession) => void;
  clearRequestOpen: () => void;
}

export const useStopwatchStore = create<StopwatchState>((set, get) => ({
  running: false,
  startedAt: null,
  baseElapsed: 0,
  laps: [],
  currentLabel: "Work",
  isComplete: false,
  exIdx: 0,
  currentSet: 1,
  lapStartBase: 0,
  session: null,
  requestOpen: false,

  getElapsed: () => {
    const s = get();
    if (s.running && s.startedAt !== null) {
      return s.baseElapsed + (performance.now() - s.startedAt);
    }
    return s.baseElapsed;
  },

  start: (label?) =>
    set((s) => ({
      running: true,
      startedAt: performance.now(),
      currentLabel: label ?? s.currentLabel,
    })),

  pause: () => {
    const s = get();
    if (!s.running || s.startedAt === null) return;
    set({ running: false, baseElapsed: s.baseElapsed + (performance.now() - s.startedAt), startedAt: null });
  },

  reset: () =>
    set({
      running: false,
      startedAt: null,
      baseElapsed: 0,
      laps: [],
      currentLabel: "Work",
      isComplete: false,
      exIdx: 0,
      currentSet: 1,
      lapStartBase: 0,
      session: null,
    }),

  recordLap: (label) => {
    const s = get();
    const elapsed = s.getElapsed();
    set({ laps: [{ label, ms: elapsed - s.lapStartBase }, ...s.laps], lapStartBase: elapsed });
  },

  addExerciseDoneMarker: (marker) =>
    set((s) => ({ laps: [{ ...marker, kind: "exercise-done" }, ...s.laps] })),

  setCurrentLabel: (label) => set({ currentLabel: label }),
  setIsComplete: (v) => set({ isComplete: v }),
  setExIdx: (fn) => set((s) => ({ exIdx: fn(s.exIdx) })),
  setCurrentSet: (fn) => set((s) => ({ currentSet: fn(s.currentSet) })),
  setSession: (session) => set({ session }),
  openWithSession: (session) => set({ session, requestOpen: true }),
  clearRequestOpen: () => set({ requestOpen: false }),
}));
