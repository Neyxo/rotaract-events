// Easter egg: the Rütli oath. Three fingers held on the screen for a second (as the three Confederates raised theirs), or 1291 typed
// on a keyboard, open the idle clicker (components/Clicker), which is only fetched then. Rendered once, by the top bar.
import { useEffect, useState, type ComponentType } from "react";

export function Oath() {
  const [Game, setGame] = useState<ComponentType<{ onClose: () => void }> | null>(null);
  useEffect(() => {
    let timer = 0,
      typed = "";
    const open = () =>
      void import("./Clicker")
        .then((m) => setGame(() => m.default))
        .catch(() => {
          /* offline: no game */
        });
    // every change of the fingers on the screen starts over: only three that stay down for a second count
    const touch = (ev: TouchEvent) => {
      clearTimeout(timer);
      if (ev.touches.length === 3) timer = window.setTimeout(open, 1000);
    };
    const key = (ev: KeyboardEvent) => {
      typed = (typed + ev.key).slice(-4);
      if (typed === "1291") open();
    };
    const types = ["touchstart", "touchend", "touchcancel"] as const;
    types.forEach((k) => addEventListener(k, touch, { passive: true }));
    addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      types.forEach((k) => removeEventListener(k, touch));
      removeEventListener("keydown", key);
    };
  }, []);
  return Game ? <Game onClose={() => setGame(null)} /> : null;
}
