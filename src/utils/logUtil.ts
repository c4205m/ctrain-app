import { volumeOf, type Log } from "../db/db";

// Best log = whichever has the higher training volume; latest wins ties and seeds an empty best.
export function bestLog(best: Log | undefined, latest: Log): Log {
  return !best || volumeOf(latest) >= volumeOf(best) ? latest : best;
}
