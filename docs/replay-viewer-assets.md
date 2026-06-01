# Replay Viewer Asset Notes

The embedded replay viewer currently ships a tiny static demo under `public/_replay-viewer`. It intentionally contains browser-ready PNG assets and compact JSON only; CASC/MPQ readers, model files, BLP files, DDS files, and Warcraft install data are not part of the frontend bundle.

Useful breadcrumb from the prototype: Uther's icon was first addressed through the local asset resolver as:

```ts
const UTHER_ICON_PATH = `/asset?path=${encodeURIComponent("ReplaceableTextures\\CommandButtons\\BTNUther.blp")}&hd=1`;
```

That resolved to the HD command-button asset in the Warcraft III install data and was converted once to `public/_replay-viewer/assets/ui/uther.png`. Legion unit build icons follow the same browser-facing pattern: mapped command-button images are stored as PNGs in `public/_replay-viewer/assets/command-buttons-classic` and `public/_replay-viewer/assets/command-buttons-reforged`.

The Classic set uses Team-OZE wiki art from `public/assets/art/replaceabletextures/commandbuttons` and `public/assets/art/war3mapimported` in `Team-OZE/ltd-wiki`. That repository mirrors the Legion map art paths used by `src/lib/unitIconMap.json`, including custom/imported icons.

The Reforged set uses W3Champions Reforged command-button art where it exists. Custom/imported Legion names that do not have a separate Reforged source image use the Team-OZE wiki icon as the fallback, so every mapped unit id still has a browser-ready PNG in both modes.

For the real replay viewer, keep the runtime contract simple:

1. Read object ids, icon names, stats, and placement data from replay/map/game data.
2. Resolve Warcraft virtual paths such as `ReplaceableTextures\\CommandButtons\\BTNUther.blp` or `replaceabletextures/commandbuttons/btnfootman` on the server or in an offline build step.
3. Convert BLP/DDS to PNG or WebP once and cache by object id/path/version.
4. Send the React viewer plain URLs plus normalized stats. Do not ask the browser to read CASC/MPQ data directly.
