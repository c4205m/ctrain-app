import {
  calcPlanDuration,
  isValidBackup,
  type Exercise,
  type Plan,
  type User,
  type Equipment,
  type MovementTypeEntry,
  type WeightEntry,
} from "../../db/db";
import initialData from "../../db/initial-data.json";

// In-memory dataset edited on desktop. Same shape as a backup file —
// never touches IndexedDB; the phone imports the exported file.
export interface EditorDataset {
  exercises: Exercise[];
  plans: Plan[];
  user: User[];
  equipment: Equipment[];
  movementTypes: MovementTypeEntry[];
  weightLogs: WeightEntry[];
}

export function toggleItem<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export function newEmptyDataset(): EditorDataset {
  return { exercises: [], plans: [], user: [], equipment: [], movementTypes: [], weightLogs: [] };
}

export function newDefaultDataset(): EditorDataset {
  return {
    exercises: initialData.exercises as Exercise[],
    plans: initialData.plans as Plan[],
    user: [],
    equipment: initialData.equipment,
    movementTypes: initialData.movementTypes,
    weightLogs: [],
  };
}

export function parseBackupFile(text: string): EditorDataset {
  const data = JSON.parse(text);
  if (!isValidBackup(data)) throw new Error("Not a valid cTrain backup file");
  return {
    exercises: data.exercises as Exercise[],
    plans: data.plans as Plan[],
    user: data.user as User[],
    equipment: data.equipment as Equipment[],
    movementTypes: data.movementTypes as MovementTypeEntry[],
    weightLogs: (data.weightLogs as WeightEntry[] | undefined) ?? [],
  };
}

function withPlanDuration(ds: EditorDataset, plan: Plan): Plan {
  const duration = calcPlanDuration(
    plan.exercises.map((e) => ({
      ...e,
      logDuration: ds.exercises.find((ex) => ex.id === e.exerciseId)?.latestLog?.duration,
    }))
  );
  return { ...plan, duration };
}

export function upsertExercise(ds: EditorDataset, exercise: Exercise): EditorDataset {
  const exists = ds.exercises.some((ex) => ex.id === exercise.id);
  const exercises = exists
    ? ds.exercises.map((ex) => (ex.id === exercise.id ? exercise : ex))
    : [...ds.exercises, exercise];
  const next = { ...ds, exercises };
  return { ...next, plans: next.plans.map((p) => withPlanDuration(next, p)) };
}

export function removeExercise(ds: EditorDataset, id: string): EditorDataset {
  const next = { ...ds, exercises: ds.exercises.filter((ex) => ex.id !== id) };
  return {
    ...next,
    plans: next.plans.map((p) =>
      withPlanDuration(next, { ...p, exercises: p.exercises.filter((e) => e.exerciseId !== id) })
    ),
  };
}

export function upsertPlan(ds: EditorDataset, plan: Plan): EditorDataset {
  const exists = ds.plans.some((p) => p.id === plan.id);
  const withDuration = withPlanDuration(ds, plan);
  return {
    ...ds,
    plans: exists ? ds.plans.map((p) => (p.id === plan.id ? withDuration : p)) : [...ds.plans, withDuration],
  };
}

export function removePlan(ds: EditorDataset, id: string): EditorDataset {
  return { ...ds, plans: ds.plans.filter((p) => p.id !== id) };
}

export function addEquipment(ds: EditorDataset, name: string): EditorDataset {
  return { ...ds, equipment: [...ds.equipment, { id: crypto.randomUUID(), name }] };
}

export function removeEquipment(ds: EditorDataset, id: string): EditorDataset {
  const item = ds.equipment.find((e) => e.id === id);
  if (!item) return ds;
  return {
    ...ds,
    equipment: ds.equipment.filter((e) => e.id !== id),
    exercises: ds.exercises.map((ex) =>
      ex.tools.includes(item.name) ? { ...ex, tools: ex.tools.filter((t) => t !== item.name) } : ex
    ),
  };
}

export function addMovementType(ds: EditorDataset, name: string, description?: string): EditorDataset {
  return { ...ds, movementTypes: [...ds.movementTypes, { id: crypto.randomUUID(), name, description }] };
}

export function setMovementTypeDescription(ds: EditorDataset, id: string, description: string): EditorDataset {
  return {
    ...ds,
    movementTypes: ds.movementTypes.map((m) =>
      m.id === id ? { ...m, description: description || undefined } : m
    ),
  };
}

export function removeMovementType(ds: EditorDataset, id: string): EditorDataset {
  const item = ds.movementTypes.find((m) => m.id === id);
  if (!item) return ds;
  return {
    ...ds,
    movementTypes: ds.movementTypes.filter((m) => m.id !== id),
    exercises: ds.exercises.map((ex) =>
      ex.movementType.includes(item.name)
        ? { ...ex, movementType: ex.movementType.filter((t) => t !== item.name) }
        : ex
    ),
  };
}

function syncUserWeight(ds: EditorDataset): EditorDataset {
  const latest = [...ds.weightLogs].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (!latest) return ds;
  const user = ds.user.length > 0 ? [{ ...ds.user[0], weight: latest.weight }, ...ds.user.slice(1)] : ds.user;
  return { ...ds, user };
}

export function addWeightLog(ds: EditorDataset, date: string, weight: number): EditorDataset {
  return syncUserWeight({
    ...ds,
    weightLogs: [...ds.weightLogs, { id: crypto.randomUUID(), date, weight }],
  });
}

export function updateWeightLog(ds: EditorDataset, id: string, date: string, weight: number): EditorDataset {
  return syncUserWeight({
    ...ds,
    weightLogs: ds.weightLogs.map((w) => (w.id === id ? { ...w, date, weight } : w)),
  });
}

export function removeWeightLog(ds: EditorDataset, id: string): EditorDataset {
  return syncUserWeight({ ...ds, weightLogs: ds.weightLogs.filter((w) => w.id !== id) });
}

export function setProfile(ds: EditorDataset, weight: number, height?: number): EditorDataset {
  const user =
    ds.user.length > 0 ? [{ ...ds.user[0], weight, height }, ...ds.user.slice(1)] : [{ weight, height }];
  return { ...ds, user };
}

export function exportDataset(ds: EditorDataset): void {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: ds.exercises,
    plans: ds.plans,
    user: ds.user,
    equipment: ds.equipment,
    movementTypes: ds.movementTypes,
    weightLogs: ds.weightLogs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ctrain-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
