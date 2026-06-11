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

export interface WeightEntry {
  id?: string
  date: string
  weight: number
}

export interface Equipment {
  id?: string
  name: string
}

export interface MovementTypeEntry {
  id?: string
  name: string
  description?: string
}

export const db = new Dexie("cTrainDatabase") as Dexie & {
  exercises: EntityTable<Exercise, "id">
  plans: EntityTable<Plan, "id">
  user: EntityTable<User, "id">
  equipment: EntityTable<Equipment, "id">
  movementTypes: EntityTable<MovementTypeEntry, "id">
  weightLogs: EntityTable<WeightEntry, "id">
}

db.version(1).stores({
    exercises: "&id, name, difficulty",
    plans: "&id",
    user: "++id",
    equipment: "&id, name",
    movementTypes: "&id, name",
});

db.version(2).stores({
    weightLogs: "&id, date",
});

// Backfill seed descriptions on movement types for existing installs
db.version(3).stores({}).upgrade(async (tx) => {
  const defaults = new Map(initialData.movementTypes.map((m) => [m.id, m.description]));
  await tx.table("movementTypes").toCollection().modify((mt: MovementTypeEntry) => {
    if (mt.description == null && mt.id != null) {
      const d = defaults.get(mt.id);
      if (d) mt.description = d;
    }
  });
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

const DB_KEYS = ["exercises", "plans", "user", "equipment", "movementTypes", "weightLogs"] as const;
export type BackupShape = Record<(typeof DB_KEYS)[number], unknown[]>;

export function isValidBackup(data: unknown): data is BackupShape {
  if (!data || typeof data !== "object") return false;
  return DB_KEYS.filter((k) => k !== "weightLogs").every((k) => Array.isArray((data as Record<string, unknown>)[k]));
}

export async function exportData(): Promise<void> {
  const [exercises, plans, user, equipment, movementTypes, weightLogs] = await Promise.all([
    db.exercises.toArray(),
    db.plans.toArray(),
    db.user.toArray(),
    db.equipment.toArray(),
    db.movementTypes.toArray(),
    db.weightLogs.toArray(),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    plans,
    user,
    equipment,
    movementTypes,
    weightLogs,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ctrain-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function clearAllTables(): Promise<void> {
  await Promise.all(DB_KEYS.map((k) => db[k].clear()));
}

export async function eraseData(): Promise<void> {
  await db.transaction("rw", [db.exercises, db.plans], async () => {
    await Promise.all([db.exercises.clear(), db.plans.clear()]);
  });
}

export async function resetWeightData(): Promise<void> {
  await db.transaction("rw", [db.user, db.weightLogs], async () => {
    await db.weightLogs.clear();
    const users = await db.user.toArray();
    if (users[0]?.id != null) await db.user.update(users[0].id, { weight: 0 });
  });
}

export async function resetAllLogs(): Promise<void> {
  await db.transaction("rw", [db.exercises, db.plans], async () => {
    const exercises = await db.exercises.toArray();
    await Promise.all(
      exercises.map((ex) => db.exercises.update(ex.id!, { latestLog: undefined, highestLog: undefined }))
    );
    const plans = await db.plans.toArray();
    await Promise.all(
      plans.map((p) => db.plans.put({ ...p, duration: calcPlanDuration(p.exercises) }))
    );
  });
}

export async function importData(data: BackupShape): Promise<void> {
  await db.transaction("rw", [db.exercises, db.plans, db.user, db.equipment, db.movementTypes, db.weightLogs], async () => {
    await clearAllTables();
    await db.exercises.bulkAdd(data.exercises as never);
    await db.plans.bulkAdd(data.plans as never);
    await db.user.bulkAdd(data.user as never);
    await db.equipment.bulkAdd(data.equipment as never);
    await db.movementTypes.bulkAdd(data.movementTypes as never);
    if (data.weightLogs) await db.weightLogs.bulkAdd(data.weightLogs as never);
  });
}

export async function addWeightEntry(weight: number): Promise<void> {
  await db.weightLogs.add({ id: crypto.randomUUID(), date: new Date().toISOString(), weight });
  const users = await db.user.toArray();
  if (users[0]?.id != null) {
    await db.user.update(users[0].id, { weight });
  } else {
    await db.user.add({ weight });
  }
}

async function syncUserWeightToLatest(): Promise<void> {
  const latest = await db.weightLogs.orderBy("date").last();
  if (!latest) return;
  const users = await db.user.toArray();
  if (users[0]?.id != null) await db.user.update(users[0].id, { weight: latest.weight });
}

export async function updateWeightEntry(id: string, weight: number): Promise<void> {
  await db.weightLogs.update(id, { weight });
  await syncUserWeightToLatest();
}

export async function deleteWeightEntry(id: string): Promise<void> {
  await db.weightLogs.delete(id);
  await syncUserWeightToLatest();
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

// Equipment
export async function addEquipment(name: string): Promise<void> {
  await db.equipment.add({ id: crypto.randomUUID(), name })
}

export async function countExercisesUsingTool(name: string): Promise<number> {
  return db.exercises.filter((ex) => ex.tools.includes(name)).count()
}

export async function deleteEquipment(id: string, name: string): Promise<void> {
  await db.transaction("rw", [db.equipment, db.exercises], async () => {
    await db.equipment.delete(id)
    const exercises = await db.exercises.filter((ex) => ex.tools.includes(name)).toArray()
    await Promise.all(
      exercises.map((ex) => db.exercises.update(ex.id!, { tools: ex.tools.filter((t) => t !== name) }))
    )
  })
}

export async function renameEquipment(id: string, oldName: string, newName: string): Promise<void> {
  await db.transaction("rw", [db.equipment, db.exercises], async () => {
    await db.equipment.update(id, { name: newName })
    const exercises = await db.exercises.filter((ex) => ex.tools.includes(oldName)).toArray()
    await Promise.all(
      exercises.map((ex) =>
        db.exercises.update(ex.id!, { tools: ex.tools.map((t) => (t === oldName ? newName : t)) })
      )
    )
  })
}

export async function resetEquipmentToDefaults(): Promise<void> {
  await db.transaction("rw", db.equipment, async () => {
    await db.equipment.clear()
    await seedEquipment(db)
  })
}

// Movement Types
export async function addMovementType(name: string, description?: string): Promise<void> {
  await db.movementTypes.add({ id: crypto.randomUUID(), name, description })
}

export async function updateMovementTypeDescription(id: string, description: string): Promise<void> {
  // Dexie deletes the key when the update value is undefined — empty input removes the field
  await db.movementTypes.update(id, { description: description.trim() || undefined })
}

export async function countExercisesUsingMovementType(name: string): Promise<number> {
  return db.exercises.filter((ex) => ex.movementType.includes(name)).count()
}

export async function deleteMovementType(id: string, name: string): Promise<void> {
  await db.transaction("rw", [db.movementTypes, db.exercises], async () => {
    await db.movementTypes.delete(id)
    const exercises = await db.exercises.filter((ex) => ex.movementType.includes(name)).toArray()
    await Promise.all(
      exercises.map((ex) => db.exercises.update(ex.id!, { movementType: ex.movementType.filter((t) => t !== name) }))
    )
  })
}

export async function renameMovementType(id: string, oldName: string, newName: string): Promise<void> {
  await db.transaction("rw", [db.movementTypes, db.exercises], async () => {
    await db.movementTypes.update(id, { name: newName })
    const exercises = await db.exercises.filter((ex) => ex.movementType.includes(oldName)).toArray()
    await Promise.all(
      exercises.map((ex) =>
        db.exercises.update(ex.id!, {
          movementType: ex.movementType.map((t) => (t === oldName ? newName : t)),
        })
      )
    )
  })
}

export async function resetMovementTypesToDefaults(): Promise<void> {
  await db.transaction("rw", db.movementTypes, async () => {
    await db.movementTypes.clear()
    await seedMovementTypes(db)
  })
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