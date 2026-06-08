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

## License

GPL-3.0
