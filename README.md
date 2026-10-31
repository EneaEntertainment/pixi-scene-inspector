# Pixi Scene Inspector

[Live demo](https://eneaentertainment.github.io/pixi-scene-inspector/)

Chrome extension (and optional in-page overlay) that detects a PixiJS app and visualizes its **scene tree**. Nodes are colored by display-object type; custom labels and invisible nodes are shown distinctly. The docked overlay also opens a **properties** inspector for the selected node.

## Setup

```bash
npm install
npm run build
```

Load the extension:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `build/` folder

## Usage (Chrome extension)

In your game/app, expose the Pixi application (first match wins):

```js
globalThis.__PIXI_APP__ = app;
```

Lookup order: `__PIXI_STAGE__` → `__PIXI_APP__.stage` → `renderer.lastObjectRendered` / `_lastObjectRendered` (from `__PIXI_RENDERER__` or `__PIXI_APP__.renderer`).

With the extension loaded, press **Shift+`` ` ``** on the game page to toggle the **docked** in-page panel (same behavior as `togglePixiSceneInspector` — no game import needed). Press again to close.

The header shows node count and which global was used. **live** refresh (~1s) is on by default; uncheck it or click **Refresh**. The interval is set in the extension options (0–10s; **0** turns live refresh off). Use the **filter…** field to keep only matching nodes (and their ancestors); matches are highlighted. Press **?** for the shortcuts panel (Esc closes it).

Selected node is available in the page console as `$pixi`.

### Selection highlight (docked overlay)

Enable **highlight** in the header (off by default) to outline the selected node on the game canvas. Anchor, when present, is marked with a small circle. The setting is remembered in `localStorage`.

### Properties panel (docked overlay)

Docked mode mounts a right-side **Properties** panel for the selected node (transform, visibility, rendering, interactivity). Fields appear only when the live Pixi object exposes them.

- Toggle **Float** / **Dock** in the panel header: floating mode can be dragged and corner-resized; docked mode resizes from the left edge and shrinks the game shell.
- Number fields support click-drag scrubbing (Esc cancels an in-progress scrub). Hold **Option/Alt** when releasing a scrub, or when nudging with the field arrows / `↑` `↓`, to snap the value to the nearest step.
- Layout for both panels (`properties` / `tree`: mode, position, width, height) and the **highlight** toggle are stored in `localStorage` under `pixi-scene-inspector-settings`.

Plain `mountPixiSceneInspector` (no docked overlay) does not include the properties panel.

### Selection & expand

| Action | Effect |
| --- | --- |
| Click | Select (first click on a new node does not expand) |
| Shift or ⌘/Ctrl+click | Toggle multi-select (see below) |
| Second click / `+` / `=` | Expand one level |
| Option/Alt+click / `-` / `_` | Collapse one level |

### Multi-select

Hold **Shift** or **⌘** / **Ctrl** and click a node to add it to the selection, or remove it if it was already selected. A plain click replaces the selection with that single node.

A node and one of its ancestors cannot both stay selected: adding either drops the conflicting ids. The last-toggled (or last single-clicked) node is the **primary** selection — it is exposed as `$pixi` in the page console.

With more than one node selected:

- Click any selected node (or press `+` / `=` / `-` / `_`) to expand or collapse **all** selected nodes one level.
- Arrow keys navigate from the primary node and replace the selection with that single target.
- Drag or **⌘/Ctrl+C** / **⌘/Ctrl+V** moves the whole selection; paste targets the primary node as parent.
- **h** toggles `visible` on every selected node.
- Entering isolate (**i**) requires a single selection; press again to exit (exit still works if more than one node is selected).
- Canvas **highlight** (when enabled) draws the union bounds of the selection.
- The Properties panel keeps only shared **transform** fields (`position`, `scale`, `rotation` / `angle`). Matching values show as shared; mixed values stay blank. Typing a number sets that absolute value on every selected node; scrubbing or arrow nudges apply a **delta** to each. Export and copy-name are unavailable for a multi-selection.

### Keyboard navigation

| Key | Effect |
| --- | --- |
| `←` / `→` | Previous / next sibling (from primary; replaces a multi-selection) |
| Option/Alt+`←` / `→` | First / last sibling |
| `↑` | Parent |
| `↓` | First child (expands if needed) |
| Option/Alt+`↑` / `↓` | Root / deepest first child |
| `i` | Isolate selected subtree (enter needs one node; press again to exit) |
| `h` | Toggle `visible` on every selected node (blocked for Camera3D / Scene3D) |
| Esc | Clear selection (also cancels an in-progress drag / number scrub, or closes help) |
| Shift+Esc | Restore selection cleared by Esc (if nothing else is selected and the tree is unchanged) |
| `?` | Toggle shortcuts help |

### Reparent

- **Drag & drop** selected node(s) onto another → append as last child; drop in a gap between siblings → insert at that index. Esc cancels an in-progress drag.
- **⌘/Ctrl+C** then **⌘/Ctrl+V** → move the copied node(s) under the primary selection (append).

## Usage (HTML overlay)

Mount the panel into any DOM element in the same page as the Pixi app (dev builds only recommended):

```ts
import { mountPixiSceneInspector } from "pixi-scene-inspector/overlay";

const el = document.createElement("div");

document.body.appendChild(el);

const tree = mountPixiSceneInspector(el);

tree.refresh();
tree.unmount();
```

Optional `host` injects a custom `PixiTreeHost` (snapshot / select / visibility / move). Default is the in-page host that talks to the same globals as the extension.

For a bottom **tree** panel that shrinks the game viewport (and mounts the properties panel):

```ts
import { dockPixiSceneInspector } from "pixi-scene-inspector/overlay";

const docked = dockPixiSceneInspector({ height: "40%", resizable: true });

docked.refresh();
docked.unmount();
```

`dockPixiSceneInspector` moves existing `body` children into a top shell, mounts the **tree** panel at the bottom and **properties** on the right (either panel can float), and dispatches `resize`. It also best-effort patches `window` / `visualViewport` / `documentElement` size getters for apps that still size from the full window. With `resizable` (default `true`), docked edges and floating corners can be dragged; sizes are remembered in `localStorage`.

`togglePixiSceneInspector` mounts or unmounts programmatically. Prefer **either** the Chrome extension **or** an in-page hotkey — not both on the same page (two listeners would open then immediately close the panel).

Without the extension, install the same **Shift+`` ` ``** toggle from the page:

```ts
import { installPixiSceneInspectorHotkey } from "pixi-scene-inspector/overlay";

installPixiSceneInspectorHotkey({ height: "40%" });
```

`installPixiSceneInspectorHotkey` is idempotent (`globalThis` guard) and returns `true` when it installed the listener, or `false` when one was already present. The extension already calls it from a MAIN-world content script (`content-dock.js`), so games that only expose `__PIXI_APP__` need no import.

### Scaling the canvas with the tree panel

Do **not** rely on patched `window.innerHeight` for reliable resize. Size the renderer to a **game root element** that fills the available area (the overlay shell becomes that area when the panel is open). Pixi’s `resizeTo` already listens for `window` `resize` and reads the element’s `clientWidth` / `clientHeight`:

```html
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; }

  #game {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
</style>
<div id="game"></div>
```

```ts
const gameRoot = document.getElementById("game")!;
const app = new Application();

await app.init({
  resizeTo: gameRoot,
  background: "#2b2b2b",
  antialias: true,
});

gameRoot.appendChild(app.canvas);
```

Alternatives: call `app.renderer.resize(gameRoot.clientWidth, gameRoot.clientHeight)` (or your own layout pass) from a `resize` listener / `ResizeObserver` on the game root. Keep fixed UI (hints, overlays) inside the same moved subtree so it stays above the canvas inside the shell.

Requires the same globals as the extension (`__PIXI_APP__`, etc.).

Package export: `pixi-scene-inspector/overlay` → `build/overlay.js` + `build/overlay.d.ts` (run `npm run build` first; `svelte` is a peer import).

## Demo


```bash
npm run demo
```

Open http://localhost:5179 and press **Shift+`` ` ``** to toggle the docked panel.

The demo exposes `globalThis.__PIXI_APP__` and calls `installPixiSceneInspectorHotkey` (idempotent). If the Chrome extension is already loaded, that call is a no-op and the extension owns the hotkey; otherwise the demo installs it so the page works standalone. Either way only one listener toggles the panel — the demo never mounts the inspector on load. On startup the browser console logs which path ran (extension already owns the hotkey vs in-page install).

The canvas is letterboxed to a fixed safe size inside `#game` and rescales on `window` `resize` (including when the docked shell shrinks the viewport).

The live scene exercises core display-object types from `pixi.js` (containers, sprites including `GifSprite`, text variants, graphics, meshes, `ParticleContainer`, `RenderContainer`, `DOMContainer`, `RenderLayer`), plus inspector UX cases (long / empty labels, hidden nodes, nested depth, text fill/stroke/shadow). **Spine** is intentionally omitted for now.

## Develop

```bash
npm run dev
```

Rebuilds on change (esbuild watch on port `10809`). Reload the extension after changes.

```bash
npm run check
```

Type-checks TypeScript and Svelte (`0` errors / warnings expected).

## Credits

Thanks to [bfanger/pixi-inspector](https://github.com/bfanger/pixi-inspector) for the inspiration.

## License

[MIT](https://opensource.org/licenses/MIT)
