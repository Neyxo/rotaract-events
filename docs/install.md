# Opening the installed app on Android

What a page in the browser can and cannot do to open the installed app, and why. Tested on a Samsung phone with Chrome 149 and Samsung Internet 30 (November 2026, app 0.17.11). "Read" means read in Chromium's source; "seen" means seen on the phone; the rest is marked as a guess.

To repeat the tests: developer mode, then `#/dev/app` ("Installed app"). It shows what the browser knows and has the links P to T named below.

## What happens

| App installed by | Link tapped in Chrome | Link tapped in Samsung Internet | Link tapped in another app |
| --- | --- | --- | --- |
| Chrome | the app opens | the app opens | the app opens |
| Samsung Internet | Android asks: Chrome or Samsung Internet | the page reloads | the app opens |
| Samsung Internet, with its "Opening links" switch on (see below) | the app opens | the app opens | the app opens |

"Link" is the one Settings and the install step use (`openAnyUrl()` in `web/src/lib/install.ts`, P on the Dev page):

```
intent://neyxo.github.io/rotaract-events/#Intent;scheme=https;end
```

A plain link to the app's own address always stays in the tab, in both browsers. An intent is the one way out.

For an app Samsung Internet installed, Settings does not offer the link: it shows an arrow to the app icon in Samsung Internet's address bar, which opens it.

## Why

- **Each browser builds its own app.** Chrome's is `org.chromium.webapk.…`, built by Google's server and installed through Google Play. Samsung Internet's is `com.sec.android.app.sbrowser.webapk.…`, built and installed by Samsung Internet. Both can be installed at once.
- **Each browser only knows its own.** `navigator.getInstalledRelatedApps()` reports the app in the browser that installed it and nothing in the other. Chrome only accepts a package signed by its own server (read). It also needs the manifest to list itself under `related_applications`, with exactly the address the page names (read); ours does.
- **Chrome opens its own app itself.** For a link from a tap, Chrome looks for apps that claim the address and opens its own when it is the only one (read). That is why its app needs no approval from Android.
- **Samsung's app is not approved for links.** Since Android 12 an app gets web links only if Android verified it for the host or the person switched it on. Samsung's app does not ask for verification (seen: no `autoVerify` on its link filter, and `pm get-app-links` has no entry for it), so it starts switched off. That is how Samsung Internet builds every app, not something about this site: Spotify's and Pinterest's, installed the same way, are the same (seen). Android then doesn't count it, and the link goes to a browser.
- **A link from another app still reaches it.** Probably because it goes to Samsung Internet as the default browser, which passes it on to its own app (a guess). The "Open" in the menu of selected text takes the same road.

## The switch

Android Settings › Apps › Choose default apps › Opening links › Rotaract. The app from Samsung Internet lists `neyxo.github.io` with a switch that is off. Switched on, the link opens the app from both browsers. Chrome's app lists the host without a switch.

The app does not tell people about it: it is one more setting for a small gain, and the address-bar icon works without it. A page cannot flip the switch or open that settings screen.

## What does not work

Tried on the phone, all without effect for the app Samsung Internet installed:

- plain links, `window.open`, a new tab
- intents naming `com.android.chrome` or `com.sec.android.app.sbrowser`, with `launchFlags`, or with action and category named (Q)
- an intent to nothing with this site as `S.browser_fallback_url` (T): opens Chrome's app from Chrome, reloads otherwise
- a `protocol_handlers` entry (`web+rotaract`): installed apps on Android cannot register one (read)

Naming the app's package in the intent (R, S) opens Chrome's app from Chrome, but the plain link already does. Not tried for Samsung's package.

Not available on Android (read): `launch_handler`, `scope_extensions`, Chrome's "Open in app" button.

## Ideas left

- **`assetlinks.json`.** A file at `https://neyxo.github.io/.well-known/assetlinks.json` (a separate `neyxo.github.io` repository) could approve an app for the host. It does nothing for Samsung's app as long as that app does not ask for verification, and no app Samsung Internet builds does. Its package name (`w` and 33 hex digits, not a plain hash of the app's address or id) may also differ per phone, and the file needs the exact name.
- **A redirect through another host.** A link to a different host that sends the browser straight back may let it leave the tab (Chromium's rule; unknown for Samsung Internet). Needs a second host.
- **A Trusted Web Activity on Google Play.** An app of our own with verified links. Decided against for now: a developer account and a second way to release.
- **An own domain** changes none of this, and a new address is a new app: everyone would install again and lose their clubs and saved events.

## Looking at the phone

```bash
adb shell pm list packages | grep -i webapk          # the installed web apps
adb shell pm get-app-links PACKAGE                   # verification state; no entry: the app does not ask
adb shell dumpsys package PACKAGE | grep -i -A4 VIEW # the addresses it claims
```

In Chrome, `chrome://webapks` lists its apps with package name and manifest address.
