const SERVER_URL = 'http://localhost:3001'

// Builds the CSV string for the end-of-turn snapshot.
// Pure function — no side effects, fully testable.
export const generateTurnCSV = (cell: string, turnsPassed: number): string =>
  `turns_passed,cell\n${turnsPassed},${cell}`

// POSTs the turn snapshot to the local game server, which writes it to junk_folder/.
// Fire-and-forget — errors are logged to the console, not propagated.
export const exportTurnCSV = (cell: string, turnsPassed: number): void => {
  fetch(`${SERVER_URL}/save-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cell, turnsPassed }),
  }).catch(err => console.error('[csv-export] Failed to save turn:', err))
}
