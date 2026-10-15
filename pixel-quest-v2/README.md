# Pixel Quest: Worlds Beyond 🎮

An original 8-bit-style side-scrolling platformer built with vanilla HTML, CSS and JavaScript. No frameworks, installs, or external game assets are required.

## Features
- Four themed worlds: Sunny Grassland, Crystal Caves, Lava Kingdom and Star Sky
- A unique boss encounter at the end of each world
- Custom pixel hero with simple movement animation
- Procedurally synthesized retro sound effects using the Web Audio API
- Collectible stars, shield, double-jump and boss-blast power-ups
- Title screen, continue option, and browser-local save progress
- Keyboard and mobile touch controls
- Responsive canvas rendering

## Run locally
1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. Click **Start Adventure**. Sound begins after your first interaction.

## Controls
- **← / →** or **A / D** — move
- **Space / ↑ / W** — jump (double-jump after collecting the 2 power-up)
- **X** — use boss blast if collected; otherwise activate a shield
- **R** — restart the current world
- **Touch controls** — on-screen buttons on mobile

## Save system
Progress is saved to this browser's `localStorage`. A save does not automatically transfer to another browser or device. Use **Reset Save** to erase progress.

## Publish with GitHub Pages
1. Create a repository named `pixel-quest`.
2. Upload `index.html`, `style.css`, `game.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`, then save.
6. Once deployment completes, open the URL shown in the Pages settings.

## Customize
World themes, level lengths, boss health, and boss names live in the `WORLDS` array near the top of `game.js`. Platform and collectible placement is generated in `makeLevel()`. The hero, enemies, scenery, and bosses are drawn directly with Canvas rectangles, so the pixel art can be edited in code.

## Notes
- This is an original tribute to classic platform games, not a Mario ROM or asset rip.
- Audio is synthesized locally; no music files or network calls are needed.
