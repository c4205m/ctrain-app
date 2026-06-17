import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { db, calcPlanDuration, type Exercise, type Plan } from "../db/db";
import type { MuscleGroup, DifficultyLevel } from "../db/types";

export const SHARE_MAX_EXERCISES = 30;

// A single QR holding the whole code gets too dense to scan off a phone screen,
// so codes are split into low-density frames shown as an animated sequence.
// ~180 data bytes/frame keeps each QR around version 7-8 (chunky, easy to scan).
const CHUNK_PREFIX = "CT1";
const CHUNK_DATA_BYTES = 180;

// Compact wire format: short keys keep URLs small. Exercises carry no ids or
// logs — receivers regenerate ids and start fresh.
export interface SharedExercise {
  n: string; // name
  m: MuscleGroup[]; // muscles
  d: DifficultyLevel; // difficulty
  t: string[]; // tools
  mt: string[]; // movementType
  u?: string; // url
}

interface SharedPlan {
  n: string; // name
  dsc: string; // description
  e: Array<[number, number, number]>; // [exercise index, sets, reps]
}

export interface SharePayload {
  v: 1;
  x: SharedExercise[];
  p?: SharedPlan | SharedPlan[]; // single (legacy) or batch — normalized on parse
}

// How to handle an incoming exercise whose name already exists in the DB.
export type ExResolution = "keep" | "copy" | "overwrite";

// First free name: base, else "base 2", "base 3"… (case-insensitive). `taken`
// holds lowercased names already in use; caller adds the result back.
function nextName(base: string, taken: Set<string>): string {
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}

function stripExercise(ex: Exercise): SharedExercise {
  return {
    n: ex.name,
    m: ex.muscles,
    d: ex.difficulty,
    t: ex.tools,
    mt: ex.movementType,
    ...(ex.url ? { u: ex.url } : {}),
  };
}

// Codes are the raw lz-string payload — no URL, so receivers paste/scan them
// straight into the app and never bounce through a browser.
function encodePayload(payload: SharePayload): string {
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

// Split a code into animated QR frames. lz-string's URL-safe alphabet never
// contains ".", so "." is a safe field separator: CT1.<id>.<idx>.<total>.<data>
export function chunkShareCode(code: string): string[] {
  const id = Math.random().toString(36).slice(2, 6);
  const parts: string[] = [];
  for (let i = 0; i < code.length; i += CHUNK_DATA_BYTES) {
    parts.push(code.slice(i, i + CHUNK_DATA_BYTES));
  }
  const total = parts.length;
  return parts.map((data, idx) => `${CHUNK_PREFIX}.${id}.${idx}.${total}.${data}`);
}

export interface ShareChunk {
  id: string;
  idx: number;
  total: number;
  data: string;
}

export function parseChunk(raw: string): ShareChunk | null {
  const m = raw.match(/^CT1\.([a-z0-9]+)\.(\d+)\.(\d+)\.(.*)$/s);
  if (!m) return null;
  const idx = Number(m[2]);
  const total = Number(m[3]);
  if (total < 1 || idx < 0 || idx >= total) return null;
  return { id: m[1], idx, total, data: m[4] };
}

export function buildExerciseShareCode(exercise: Exercise): string {
  return buildExercisesShareCode([exercise]);
}

export function buildExercisesShareCode(exercises: Exercise[]): string {
  if (exercises.length > SHARE_MAX_EXERCISES) {
    throw new Error(`Can't share more than ${SHARE_MAX_EXERCISES} exercises`);
  }
  return encodePayload({ v: 1, x: exercises.map(stripExercise) });
}

export function buildPlanShareCode(plan: Plan, exercises: Exercise[]): string {
  return buildPlansShareCode([plan], exercises);
}

// Bundle plans plus their exercises into one payload. Exercises are deduped by
// id into a shared x array; each plan's e tuples index into it.
export function buildPlansShareCode(plans: Plan[], exercises: Exercise[]): string {
  const exById = new Map(exercises.map((ex) => [ex.id, ex]));
  const sharedX: SharedExercise[] = [];
  const indexById = new Map<string, number>();

  const sharedPlans: SharedPlan[] = plans.map((plan) => {
    const refs = plan.exercises.filter((e) => exById.has(e.exerciseId));
    const e: Array<[number, number, number]> = refs.map((ref) => {
      let idx = indexById.get(ref.exerciseId);
      if (idx == null) {
        idx = sharedX.length;
        indexById.set(ref.exerciseId, idx);
        sharedX.push(stripExercise(exById.get(ref.exerciseId)!));
      }
      return [idx, ref.sets, ref.reps];
    });
    return { n: plan.name, dsc: plan.description, e };
  });

  if (sharedX.length > SHARE_MAX_EXERCISES) {
    throw new Error(`These plans reference more than ${SHARE_MAX_EXERCISES} exercises`);
  }
  return encodePayload({ v: 1, x: sharedX, p: sharedPlans });
}

export function parseShareCode(code: string): SharePayload | null {
  try {
    const json = decompressFromEncodedURIComponent(code.trim());
    if (!json) return null;
    const data = JSON.parse(json);
    if (data?.v !== 1 || !Array.isArray(data.x) || data.x.length === 0) return null;
    if (data.x.length > SHARE_MAX_EXERCISES) return null;
    if (data.x.some((e: SharedExercise) => typeof e.n !== "string" || !Array.isArray(e.m))) return null;
    return data as SharePayload;
  } catch {
    return null;
  }
}

function planList(payload: SharePayload): SharedPlan[] {
  return payload.p == null ? [] : Array.isArray(payload.p) ? payload.p : [payload.p];
}

export interface ImportCollision {
  index: number; // into payload.x
  name: string;
  existing: Exercise; // your matching row, for diffing against the incoming copy
}

// Incoming exercises whose name already exists in the DB. Drives the import
// resolution UI.
export async function analyzeImport(payload: SharePayload): Promise<ImportCollision[]> {
  const existing = await db.exercises.toArray();
  const byName = new Map(existing.map((e) => [e.name.toLowerCase(), e]));
  const out: ImportCollision[] = [];
  payload.x.forEach((e, i) => {
    const match = byName.get(e.n.toLowerCase());
    if (match) out.push({ index: i, name: e.n, existing: match });
  });
  return out;
}

export interface ImportOutcome {
  renamedPlans: { from: string; to: string }[];
}

// Merge into DB. Missing tools/moves are created. Name-clashing exercises follow
// `resolutions` (default "keep"): keep reuses your row, "copy" adds a suffixed
// duplicate, "overwrite" replaces your row's data. Plans with a clashing name
// are auto-suffixed. Plan durations recalculated.
export async function importShared(
  payload: SharePayload,
  resolutions: Record<number, ExResolution> = {},
): Promise<ImportOutcome> {
  return db.transaction("rw", [db.exercises, db.plans, db.equipment, db.movementTypes], async () => {
    const [existing, equipment, movementTypes, existingPlans] = await Promise.all([
      db.exercises.toArray(),
      db.equipment.toArray(),
      db.movementTypes.toArray(),
      db.plans.toArray(),
    ]);

    const toolNames = new Set(equipment.map((e) => e.name));
    const moveNames = new Set(movementTypes.map((m) => m.name));
    for (const ex of payload.x) {
      for (const t of ex.t) {
        if (!toolNames.has(t)) {
          toolNames.add(t);
          await db.equipment.add({ id: crypto.randomUUID(), name: t });
        }
      }
      for (const mt of ex.mt) {
        if (!moveNames.has(mt)) {
          moveNames.add(mt);
          await db.movementTypes.add({ id: crypto.randomUUID(), name: mt });
        }
      }
    }

    const byName = new Map(existing.map((ex) => [ex.name.toLowerCase(), ex.id!]));
    const takenNames = new Set(existing.map((ex) => ex.name.toLowerCase()));
    const ids: string[] = [];
    for (let i = 0; i < payload.x.length; i++) {
      const shared = payload.x[i];
      const found = byName.get(shared.n.toLowerCase());
      const choice = found ? resolutions[i] ?? "keep" : null;

      if (found && choice === "keep") {
        ids.push(found);
        continue;
      }
      if (found && choice === "overwrite") {
        // url removed when absent — Dexie deletes keys set to undefined.
        await db.exercises.update(found, {
          muscles: shared.m,
          difficulty: shared.d,
          tools: shared.t,
          movementType: shared.mt,
          url: shared.u ?? undefined,
        });
        ids.push(found);
        continue;
      }

      // New exercise, or "copy" of a clashing name (suffix to stay unique).
      const name = found ? nextName(shared.n, takenNames) : shared.n;
      const id = crypto.randomUUID();
      await db.exercises.add({
        id,
        name,
        muscles: shared.m,
        difficulty: shared.d,
        tools: shared.t,
        movementType: shared.mt,
        ...(shared.u ? { url: shared.u } : {}),
      });
      takenNames.add(name.toLowerCase());
      byName.set(name.toLowerCase(), id);
      ids.push(id);
    }

    const planNames = new Set(existingPlans.map((p) => p.name.toLowerCase()));
    const renamedPlans: { from: string; to: string }[] = [];
    for (const p of planList(payload)) {
      const name = nextName(p.n, planNames);
      if (name !== p.n) renamedPlans.push({ from: p.n, to: name });
      planNames.add(name.toLowerCase());
      await db.plans.add({
        id: crypto.randomUUID(),
        name,
        description: p.dsc,
        createdAt: new Date().toISOString(),
        exercises: p.e.map(([i, sets, reps]) => ({ exerciseId: ids[i], sets, reps })),
        duration: calcPlanDuration(p.e.map(([, sets, reps]) => ({ sets, reps }))),
      });
    }

    return { renamedPlans };
  });
}
