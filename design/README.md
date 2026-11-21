# Design reference

| Folder / file | What it is |
| --- | --- |
| `tokens.json` | Colours, fonts, sizes from the logo and mockup — load through `packages/ui/theme` |
| `logo/` | Final Senzo logo (SVG + PNG, light and dark), the bowl-and-flame mark, app icons for **Senzo** (guest, paper background) and **Senzo Partner** (chef, ink background); `*-store.svg` and `*-1024.png` / `*-512.png` are square store icons (the stores round the corners) |
| `mockups/m/G*.dc.html` | Guest app screens (G01–G24) |
| `mockups/m/C*.dc.html` | Chef app screens (C01–C22) |
| `mockups/m/ChefFig, DishArt, KitchenBg` | Illustration components used by many screens |
| `mockups/Main.dc.html`, `ChefSignup.dc.html` | Web: browse & book, chef signup |
| `mockups/canvas.json` | Board titles and layout of the mockup canvas |

## How to read the mockup files

They are design-canvas source (`.dc.html`): HTML markup inside `<x-dc>` with `{{holes}}`, `<sc-for>` loops and `<sc-if>` branches, plus a `class Component` whose `renderVals()` holds the demo data and logic. They do not run on their own (they need the canvas runtime) — read them for layout, copy, states and behaviour, then rebuild in React Native with `packages/ui`.

Live, clickable version: https://claude.ai/artifact/YG47do5uVVJyJuMRXHG9H1 · Logo canvas: https://claude.ai/artifact/WgKZGM2f4GEBr5XbovKtd7

Follow `docs/screens.md` → "Known gaps" where the mockup disagrees with a decision (for example, G18 and C13 show maps; the product has no maps).
