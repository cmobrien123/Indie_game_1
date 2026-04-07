# Hex Grid Game

A browser-based turn-based game built with TypeScript. The player moves an avatar across a 10×10 hex grid, restricted to cells marked accessible in a CSV access map. A local Express server saves a snapshot of game state to `junk_folder/game-state.csv` after every move.

## Project Structure

```
game/               # Browser entry point and game assets
  main.ts           # Renderer and click event wiring
  csvs/
    grid_access_mapping.csv   # 0/1 map defining which cells can be entered
src/
  api/
    game-state.ts   # State machine — createGameState(), applyMove()
  utils/
    grid.ts         # Hex grid creation and adjacency (odd-r offset)
    validate-move.ts
    access-map.ts   # Parses grid_access_mapping.csv at build time
    csv-export.ts   # POSTs turn snapshot to the local server
  types/
    game.ts         # Position, Cell, Grid, GameState, MoveResult
server/
  index.ts          # Express server — receives turn data, writes CSV to junk_folder/
tests/
  unit/             # Unit tests for grid, move validation, game state, CSV export
  integration/      # Multi-turn flow tests
docs/
  game-rules.md     # Full rules and dev instructions
junk_folder/
  game-state.csv    # Written after every move (turns_passed, cell)
```

## How to Run

**Terminal 1 — start the game server:**
```bash
npm install
npm run server
```

**Terminal 2 — build and open the game:**
```bash
npm run build
open index.html
```

The server must be running before you play. Each move overwrites `junk_folder/game-state.csv` with the current position and turn count.

## Development Commands

```bash
npm run dev       # Watch mode — rebuilds on file save
npm test          # Run all unit and integration tests
npm run typecheck # Type check browser and server code
```

## Game Rules

- The grid is 10×10. Columns are labelled A–J, rows 1–10.
- Cells with a `0` in `grid_access_mapping.csv` are blocked and cannot be entered.
- Each turn the player clicks an adjacent hex cell (one of up to 6 directions) to move.
- The turn counter increments only on a valid move.

## TODO

- [ ] Create inital battle framework
- [ ] Create process for tagging (ex commitizen)
- [ ] Create UI needed items
- [ ] Create beutification list (ex. planets, background, player icons that change with experience, ability to name players)

## beutification list
- create background for the map
- create icons for the units
  - GAR:
    - Rookie: Phase 1 Clone trooper helmet
    - Vet: Phase 2 Clone trooper helmet
    - EliteUnit: Ability to choose from list of helmet from lore
  - CIS:
    - Rookie: battle droid
    - Vet: super battle droid
    - EliteUnit: Ability to choose from list of droids from lore
- create plannet icons
- fix blue cells (make them normal movement cells)
