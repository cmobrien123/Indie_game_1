# Hex Grid Game — Rules & How to Play

## How to Start

You need two terminal tabs: one for the game server, one to serve the frontend.

**Terminal 1 — start the game server** (writes CSVs to `junk_folder/`):
```bash
npm run server
```

**Terminal 2 — build and open the game**:
```bash
npm install
npm run build
open index.html
```

The server must be running before you play, otherwise turn data won't be saved.

## CSV Output

After each move, `junk_folder/game-state.csv` is overwritten with the current snapshot:

```
turns_passed,cell
3,B4
```

## Objective

Move your avatar around the 10×10 hex grid. Cells that are blocked (value `0` in
`game/csvs/grid_access_mapping.csv`) appear dark and cannot be entered.

## Controls

- **Click any highlighted cell** to move your avatar there.
- Adjacent accessible cells are highlighted with a blue tint on your turn.
- Clicking a non-adjacent or blocked cell shows an error message.

## Rules

1. The avatar (▲) occupies exactly one cell at a time.
2. Each turn you may move to one of the six orthogonally adjacent hex cells.
3. You may only enter cells marked accessible (`1`) in the access map.
4. The turn counter increments only on a successful move.

## Development

```bash
npm run dev       # rebuild dist/bundle.js on every file save
npm test          # run all unit and integration tests
npm run typecheck # TypeScript type check (browser + server)
```
