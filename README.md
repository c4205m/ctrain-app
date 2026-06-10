# cTrain

A workout tracker that runs in your browser. No accounts, no backend. Everything is stored locally on your device via IndexedDB.

## What it does

- Log exercises by reps, distance, or duration. Weight is optional; bodyweight is supported.
- Tracks personal records per exercise. If you beat your previous best, it updates automatically.
- Muscle heatmap shows what you've been training and what you've been skipping.
- Plans let you group exercises into a workout with an estimated duration based on your logs.
- The stopwatch has a guided mode that walks you through a plan set by set, with lap splits.
- Stats on the home screen: streak, weekly sets, volume, monthly PRs. You can hide the ones you don't care about.
- The "Long time..." section shows exercises you haven't touched in 2+ weeks.
- Settings has import/export — your data is a JSON file you control.

## Data and privacy

Everything lives in your browser's IndexedDB. Nothing is sent anywhere. If you clear your browser data, your logs go with it. Use Settings → Export to keep a backup.

## Adding data manually

The export/import format is JSON. You can edit an export file and re-import it via Settings → Import.

### Exercise

```json
{
  "id": "ex-custom-01",
  "name": "My Exercise",
  "muscles": ["chest", "triceps"],
  "difficulty": "Intermediate",
  "tools": ["Barbell"],
  "movementType": ["Press"],
  "url": "https://..."
}
```

**`muscles`** — any of: `abs`, `adductor`, `abductors`, `biceps`, `calves`, `chest`, `front-deltoids`, `back-deltoids`, `forearm`, `gluteal`, `hamstring`, `lower-back`, `neck`, `obliques`, `quadriceps`, `trapezius`, `triceps`, `upper-back`

**`difficulty`** — `Beginner`, `Intermediate`, or `Advanced`

**`tools`** — names from the equipment list (e.g. `"Barbell"`, `"Dumbbells"`, `"Pull Up Bar"`). Use `[]` for bodyweight.

**`movementType`** — e.g. `"Push"`, `"Pull"`, `"Squat"`, `"Hinge"`, `"Press"`, `"Row"`, `"Curl"` — can be multiple.

`latestLog` and `highestLog` are set by the app when you log the exercise. You can seed them manually:

```json
"latestLog": {
  "date": "2025-01-15",
  "sets": 3,
  "setType": "rep",
  "effortPerSet": 10,
  "weight": 80,
  "bodyweight": false
}
```

**`setType`** — `"rep"`, `"distance"` (metres), or `"duration"` (seconds). `effortPerSet` is reps / metres / seconds depending on type. `duration` (optional) is seconds per set, used for plan time estimates.

### Plan

```json
{
  "id": "plan-custom-01",
  "name": "My Plan",
  "description": "Optional description",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "exercises": [
    { "exerciseId": "ex-01", "sets": 4, "reps": 8 }
  ],
  "duration": 0
}
```

Set `duration` to `0` — the app recalculates it on load.

## License

GPL-3.0
