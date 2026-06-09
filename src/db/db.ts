import {Dexie, type EntityTable } from 'dexie'
import type { MuscleGroup, DifficultyLevel } from './types'
import initialData from './initial-data.json'

// Not a DB 
export interface Log {
  date: string
  sets: number
  setType: "rep" | "distance" | "duration"
  effortPerSet: number // based on setType
  duration?: number // set duration for plan calc
  weight: number
  bodyweight: boolean
}

export interface Exercise {
  id?: string
  name: string
  muscles: MuscleGroup[]
  difficulty: DifficultyLevel
  tools: string[]
  movementType: string[]
  url?: string
  latestLog?: Log
  highestLog?: Log
}

export interface Plan {
  id?: string
  name: string
  description: string
  createdAt: string
  exercises: Array<{ exerciseId: string; sets: number; reps: number }>
  duration: number // estimated minutes, auto-calculated
}

export function calcPlanDuration(exercises: Array<{ sets: number; reps: number; logDuration?: number }>): number {
  return Math.round(exercises.reduce((sum, e) => {
    const mins = e.logDuration != null ? (e.sets * e.logDuration) / 60 : e.sets * 2
    return sum + mins
  }, 0));
}

export async function updatePlansForExercise(exerciseId: string): Promise<void> {
  const plans = await db.plans.toArray()
  const affected = plans.filter(p => p.exercises.some(e => e.exerciseId === exerciseId))
  if (affected.length === 0) return

  const allIds = [...new Set(affected.flatMap(p => p.exercises.map(e => e.exerciseId)))]
  const durations: Record<string, number | undefined> = {}
  await Promise.all(allIds.map(async (id) => {
    const ex = await db.exercises.get(id)
    durations[id] = ex?.latestLog?.duration
  }))

  await Promise.all(affected.map(plan =>
    db.plans.put({
      ...plan,
      duration: calcPlanDuration(plan.exercises.map(e => ({ ...e, logDuration: durations[e.exerciseId] }))),
    })
  ))
}

export interface User {
  id?: number
  weight: number
  height?: number
}

export interface Equipment {
  id?: string
  name: string
}

export interface MovementTypeEntry {
  id?: string
  name: string
}

export const db = new Dexie("cTrainDatabase") as Dexie & {
  exercises: EntityTable<Exercise, "id">
  plans: EntityTable<Plan, "id">
  user: EntityTable<User, "id">
  equipment: EntityTable<Equipment, "id">
  movementTypes: EntityTable<MovementTypeEntry, "id">
}

db.version(1).stores({
    exercises: "&id, name, difficulty",
    plans: "&id",
    user: "++id",
    equipment: "&id, name",
    movementTypes: "&id, name",
});

db.on('populate', async () => {
  await seedExercises(db);
  await seedEquipment(db);
  await seedMovementTypes(db);
  await seedPlans(db);
});

export async function seedExercises(db: { exercises: { bulkAdd: (items: Exercise[]) => Promise<unknown> } }): Promise<void> {
  await db.exercises.bulkAdd(initialData.exercises as Exercise[])
}

export async function seedEquipment(db: { equipment: { bulkAdd: (items: Equipment[]) => Promise<unknown> } }): Promise<void> {
  await db.equipment.bulkAdd(initialData.equipment)
}

export async function seedMovementTypes(db: { movementTypes: { bulkAdd: (items: MovementTypeEntry[]) => Promise<unknown> } }): Promise<void> {
  await db.movementTypes.bulkAdd(initialData.movementTypes)
}

export async function seedPlans(db: { plans: { bulkAdd: (items: Plan[]) => Promise<unknown> } }): Promise<void> {
  await db.plans.bulkAdd(initialData.plans as Plan[])
}

// Import / Export

const DB_KEYS = ["exercises", "plans", "user", "equipment", "movementTypes"] as const;
export type BackupShape = Record<(typeof DB_KEYS)[number], unknown[]>;

export function isValidBackup(data: unknown): data is BackupShape {
  if (!data || typeof data !== "object") return false;
  return DB_KEYS.every((k) => Array.isArray((data as Record<string, unknown>)[k]));
}

export async function exportData(): Promise<void> {
  const [exercises, plans, user, equipment, movementTypes] = await Promise.all([
    db.exercises.toArray(),
    db.plans.toArray(),
    db.user.toArray(),
    db.equipment.toArray(),
    db.movementTypes.toArray(),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    plans,
    user,
    equipment,
    movementTypes,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ctrain-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function eraseData(): Promise<void> {
  await db.transaction("rw", [db.exercises, db.plans, db.user, db.equipment, db.movementTypes], async () => {
    await Promise.all(DB_KEYS.map((k) => db[k].clear()));
  });
}

export async function importData(data: BackupShape): Promise<void> {
  await db.transaction("rw", [db.exercises, db.plans, db.user, db.equipment, db.movementTypes], async () => {
    await Promise.all(DB_KEYS.map((k) => db[k].clear()));
    await db.exercises.bulkAdd(data.exercises as never);
    await db.plans.bulkAdd(data.plans as never);
    await db.user.bulkAdd(data.user as never);
    await db.equipment.bulkAdd(data.equipment as never);
    await db.movementTypes.bulkAdd(data.movementTypes as never);
  });
}

// Plans
export async function addPlan(form: { name: string; description: string }): Promise<void> {
  await db.plans.add({
    id: crypto.randomUUID(),
    name: form.name,
    description: form.description,
    createdAt: new Date().toISOString(),
    exercises: [],
    duration: 0,
  })
}

export async function updatePlan(plan: Plan): Promise<void> {
  const exercises = await Promise.all(
    plan.exercises.map((e) => db.exercises.get(e.exerciseId))
  )
  const withDuration = plan.exercises.map((e, i) => ({
    ...e,
    logDuration: exercises[i]?.latestLog?.duration,
  }))
  await db.plans.put({ ...plan, duration: calcPlanDuration(withDuration) })
}

export async function deletePlan(id: string): Promise<void> {
  await db.plans.delete(id)
}

export async function clearLog(exerciseId: string): Promise<void> {
  await db.exercises.update(exerciseId, { latestLog: undefined })
}

export async function resetLogs(exerciseId: string): Promise<void> {
  await db.exercises.update(exerciseId, { latestLog: undefined, highestLog: undefined })
}

export async function deleteExercise(id: string): Promise<void> {
  await db.exercises.delete(id)
  const plans = await db.plans.toArray()
  const affected = plans.filter((p) => p.exercises.some((e) => e.exerciseId === id))
  if (affected.length === 0) return

  const remainingIds = [...new Set(
    affected.flatMap((p) => p.exercises.filter((e) => e.exerciseId !== id).map((e) => e.exerciseId))
  )]
  const exRecords = await db.exercises.bulkGet(remainingIds)
  const durations: Record<string, number | undefined> = {}
  exRecords.forEach((ex, i) => { durations[remainingIds[i]] = ex?.latestLog?.duration })

  await Promise.all(
    affected.map((p) => {
      const remaining = p.exercises.filter((e) => e.exerciseId !== id)
      return db.plans.put({
        ...p,
        exercises: remaining,
        duration: calcPlanDuration(remaining.map((e) => ({ ...e, logDuration: durations[e.exerciseId] }))),
      })
    })
  )
}