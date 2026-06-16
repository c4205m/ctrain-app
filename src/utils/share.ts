import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { db, calcPlanDuration, type Exercise, type Plan } from "../db/db";
import type { MuscleGroup, DifficultyLevel } from "../db/types";

export const SHARE_MAX_EXERCISES = 30;

// Compact wire format: short keys keep URLs small. Exercises carry no ids or
// logs — receivers regenerate ids and start fresh.
interface SharedExercise {
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

interface SharePayload {
  v: 1;
  x: SharedExercise[];
  p?: SharedPlan;
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

function buildUrl(payload: SharePayload): string {
  const data = compressToEncodedURIComponent(JSON.stringify(payload));
  return `${location.origin}${import.meta.env.BASE_URL}#share=${data}`;
}

export function buildExerciseShareUrl(exercise: Exercise): string {
  return buildUrl({ v: 1, x: [stripExercise(exercise)] });
}

export function buildPlanShareUrl(plan: Plan, exercises: Exercise[]): string {
  const refs = plan.exercises
    .map((e) => ({ ...e, ex: exercises.find((x) => x.id === e.exerciseId) }))
    .filter((e) => e.ex != null);
  return buildUrl({
    v: 1,
    x: refs.map((e) => stripExercise(e.ex!)),
    p: { n: plan.name, dsc: plan.description, e: refs.map((e, i) => [i, e.sets, e.reps]) },
  });
}

export function parseShareHash(hash: string): SharePayload | null {
  const match = hash.match(/#share=(.+)/);
  if (!match) return null;
  try {
    const json = decompressFromEncodedURIComponent(match[1]);
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

// Merge into DB: existing exercises matched by name are reused, missing
// tools/moves are created, plan duration recalculated.
export async function importShared(payload: SharePayload): Promise<void> {
  await db.transaction("rw", [db.exercises, db.plans, db.equipment, db.movementTypes], async () => {
    const [existing, equipment, movementTypes] = await Promise.all([
      db.exercises.toArray(),
      db.equipment.toArray(),
      db.movementTypes.toArray(),
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
    const ids: string[] = [];
    for (const shared of payload.x) {
      const found = byName.get(shared.n.toLowerCase());
      if (found) {
        ids.push(found);
        continue;
      }
      const id = crypto.randomUUID();
      await db.exercises.add({
        id,
        name: shared.n,
        muscles: shared.m,
        difficulty: shared.d,
        tools: shared.t,
        movementType: shared.mt,
        ...(shared.u ? { url: shared.u } : {}),
      });
      byName.set(shared.n.toLowerCase(), id);
      ids.push(id);
    }

    if (payload.p) {
      await db.plans.add({
        id: crypto.randomUUID(),
        name: payload.p.n,
        description: payload.p.dsc,
        createdAt: new Date().toISOString(),
        exercises: payload.p.e.map(([i, sets, reps]) => ({ exerciseId: ids[i], sets, reps })),
        duration: calcPlanDuration(payload.p.e.map(([, sets, reps]) => ({ sets, reps }))),
      });
    }
  });
}

export async function shareUrl(url: string, title: string): Promise<"shared" | "copied"> {
  if (navigator.share) {
    await navigator.share({ title, url });
    return "shared";
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}
