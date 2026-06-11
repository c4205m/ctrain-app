import { registerSW } from "virtual:pwa-register";

let registration: ServiceWorkerRegistration | undefined;

// No background polling: an update reloads the page, so checks only
// happen at launch (browser default) or via the Settings button
registerSW({
  onRegisteredSW(_swUrl, reg) {
    registration = reg;
  },
});

/**
 * Asks the browser to re-fetch the service worker. With registerType
 * "autoUpdate" a new version activates and reloads the page on its own,
 * so callers only need to handle the "already up to date" case.
 *
 * @returns true if a new version is installing/waiting, false if up to date
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!registration) throw new Error("Service worker not registered");
  await registration.update();
  return registration.installing !== null || registration.waiting !== null;
}
