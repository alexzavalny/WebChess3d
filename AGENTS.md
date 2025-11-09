# Repository Guidelines

## Project Structure & Module Organization
`index.html` is the only HTML entry point and wires up `src/styles/style.css`, `src/scripts/main.js`, and the CDN import map for Three.js, OrbitControls, jQuery, and Chessboard.js. `src/scripts/` houses all rendering logic modules (board construction, lighting, drag interactions, and the modal editor), with `main.js` orchestrating them. Global textures and reference media live under `img/`, while UI-state captures (`screenshot*.png`) are organized inside `img/screenshots/` to keep the root lean. Treat `boardConfig`, `squareCenters`, and `piecesGroup` as the extension points for geometry, look-and-feel, and chess logic respectively.

## Build, Test, and Development Commands
- `npx http-server . --port 4173` — preferred local server; preserves ES module imports.
- `python3 -m http.server 4173` — fallback static host when Node is unavailable.
- `open http://localhost:4173/index.html` — verify the canvas boots with no console errors.  
There is no bundler; modify files directly and refresh the browser. When editing CDN versions, update the `importmap` in `index.html`.

## Coding Style & Naming Conventions
Use two-space indentation for HTML, CSS, and JS to match the existing files. Favor `const` and `let`, arrow functions, and early returns. Module-level constants such as `defaultFEN` or `boardConfig` stay in `camelCase`, while constructor-like helpers may use `PascalCase`. Keep CSS class names lowercase with hyphens (`.modal-dialog`). Run `npx prettier --write "*.js" "*.css"` before sending a PR if you alter formatting.

## Testing Guidelines
The project is presently manual-test driven. Before opening a PR, validate: loading the default FEN, loading at least one custom FEN, dragging/rotating/zooming, editing via the modal (Clear → Start → Apply), and status messaging for invalid inputs. Capture browser console output; regressions often surface there first. When touching rendering math, compare against the latest `screenshot*.png` or add a new one.

## Commit & Pull Request Guidelines
Follow the existing imperative style (`Add board notation labels for files and ranks on the chessboard`). Keep commits scoped to a single concern and include rationale in the body when behavior changes. PRs should describe the motivation, outline functional changes, list manual tests performed, and attach updated screenshots for UI tweaks. Link to tracking issues or TODOs inside `main.js` so reviewers can trace context.

## Asset & Configuration Tips
Place new piece models, textures, or UI icons under `img/` and reference them with relative URLs. Keep board tuning changes (`edgePadding`, `tileThickness`, etc.) centralized in `boardConfig` so downstream adjustments remain predictable. When introducing additional controls, extend the existing modal/dialog patterns to preserve styling and accessibility.
