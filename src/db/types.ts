export const MuscleGroups = {
  Abs:           { slug: "abs",            color: "#f97316" },
  Adductor:      { slug: "adductor",       color: "#3b82f6" },
  Abductors:     { slug: "abductors",      color: "#06b6d4" },
  Biceps:        { slug: "biceps",         color: "#22c55e" },
  Calves:        { slug: "calves",         color: "#a855f7" },
  Chest:         { slug: "chest",          color: "#ef4444" },
  FrontDeltoids: { slug: "front-deltoids", color: "#eab308" },
  BackDeltoids:  { slug: "back-deltoids",  color: "#f59e0b" },
  Forearm:       { slug: "forearm",        color: "#84cc16" },
  Gluteal:       { slug: "gluteal",        color: "#ec4899" },
  Hamstring:     { slug: "hamstring",      color: "#14b8a6" },
  Head:          { slug: "head",           color: "#94a3b8" },
  Knees:         { slug: "knees",          color: "#64748b" },
  LowerBack:     { slug: "lower-back",     color: "#8b5cf6" },
  Neck:          { slug: "neck",           color: "#0ea5e9" },
  Obliques:      { slug: "obliques",       color: "#d946ef" },
  Quadriceps:    { slug: "quadriceps",     color: "#10b981" },
  Trapezius:     { slug: "trapezius",      color: "#f43f5e" },
  Triceps:       { slug: "triceps",        color: "#fb923c" },
  UpperBack:     { slug: "upper-back",     color: "#6366f1" },
} as const;

export const DifficultyLevels = {
  Beginner: "Beginner",
  Intermediate: "Intermediate",
  Advanced: "Advanced",
} as const;

export type MuscleGroup = (typeof MuscleGroups)[keyof typeof MuscleGroups]["slug"];;
export type DifficultyLevel = (typeof DifficultyLevels)[keyof typeof DifficultyLevels];