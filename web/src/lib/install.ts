// Installing the app: the browser's install prompt (Chrome, Edge, Android) and whether the app already runs installed.
// The prompt fires once, early, often before the screen that offers it is shown: it is caught here, at start, for the welcome
// steps and Settings alike (useInstallPrompt() in src/hooks re-renders when it arrives or is used up).
import { emitter } from "./store";

/** the beforeinstallprompt event; not in TypeScript's DOM types */
export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome?: string }>;
}

let caught: InstallPrompt | null = null;
/** installed from this tab (the browser says so): the tab itself still runs in the browser */
let installed = false;
/** the prompt was accepted, the app isn't there yet: the phone adds it in the background (Samsung Internet: some 15 seconds) */
let installing = false;
const { subscribe, emit } = emitter();

/** Samsung Internet: it installs apps itself; it darkens websites by itself, without telling the page, and its installed apps
 *  inherit that */
export const samsung = (): boolean => /SamsungBrowser\//.test(navigator.userAgent);
/** on Android, a link that opens the app in Chrome, for a browser that can't install it (DuckDuckGo, Firefox, the browser inside
 *  another app); null elsewhere (a page can name Chrome, but not "the default browser"; an iPhone has no such link at all) and in
 *  Samsung Internet, which installs it itself */
export const chromeUrl = (): string | null =>
  /Android/.test(navigator.userAgent) && !samsung()
    ? `intent://${location.host}${location.pathname}#Intent;scheme=https;package=com.android.chrome;end`
    : null;
/** the key of this system's install steps: Samsung Internet has its own menu */
export const howKey = (os: "ios" | "android" | "desktop"): "g_ios" | "g_android" | "g_desktop" | "g_samsung" =>
  os === "android" && samsung() ? "g_samsung" : `g_${os}`;
/** on Android, a link that opens the installed app from the browser tab it was just installed from: a tapped link to the app's own
 *  address stays in the tab, an intent is handed to whatever app claims the address, which the installed one does. null elsewhere:
 *  a computer opens the app's window by itself, an iPhone has no way in but the home screen, and an app installed by Samsung
 *  Internet claims no address (unlike Chrome's), so the intent comes back to the same browser and only reloads the website */
export const openAppUrl = (): string | null =>
  /Android/.test(navigator.userAgent) && !samsung()
    ? `intent://${location.host}${location.pathname.replace(/[^/]*$/, "")}#Intent;scheme=https;end`
    : null;
/** the app's address, without index.html or the route: what to share, or to paste into another browser */
export const appUrl = (): string => location.origin + location.pathname.replace(/[^/]*$/, "");

if (typeof window !== "undefined") {
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    caught = e as InstallPrompt;
    emit();
  });
  addEventListener("appinstalled", () => {
    installed = true;
    installing = false;
    caught = null;
    emit();
  });
}

export const getInstallPrompt = (): InstallPrompt | null => caught;
export const subscribeInstall = subscribe;

/** shows the browser's install dialog; a prompt works once, so it is gone afterwards (whatever the answer). Accepted, the app is
 *  "installing" until the browser says it is there (appinstalled). */
export async function install(): Promise<void> {
  const p = caught;
  if (!p) return;
  await p.prompt();
  if ((await p.userChoice)?.outcome === "accepted") {
    installing = true;
    // ponytail: a browser that never says so counts as done after a minute; read its own signal if one turns up
    setTimeout(() => {
      if (!installing) return;
      installing = false;
      installed = true;
      emit();
    }, 60_000);
  }
  caught = null;
  emit();
}

/** running as the installed app */
export const standalone = (): boolean =>
  matchMedia("(display-mode: standalone)").matches || !!(navigator as { standalone?: boolean }).standalone;
/** running installed, or installed from this tab a moment ago: no install steps to show */
export const isInstalled = (): boolean => standalone() || installed;
/** where installing stands, for a re-render when it moves on (useInstallState() in src/hooks) */
export const installState = (): "installed" | "installing" | null => {
  if (isInstalled()) return "installed";
  return installing ? "installing" : null;
};
