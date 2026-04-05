import { GameState } from '../src/models/game-state'
import { getAdjacentCells, GRID_ROWS, GRID_COLS } from '../src/utils/grid'
import { exportTurnCSV } from '../src/utils/csv-export'
import { posLabel } from '../src/utils/labels'
import type { Position } from '../src/types/game'

// Hex cell dimensions (pointy-top, odd-r offset)
const HEX_W = 30          // cell width in px
const HEX_H = 34          // cell height in px
const HEX_V_STEP = 26     // vertical distance between row tops (HEX_H * ~0.75)
const ODD_OFFSET = 15     // horizontal shift for odd rows (HEX_W / 2)

const colLabelChar = (col: number) => {
  if (col < 26) return String.fromCharCode(65 + col)
  return String.fromCharCode(64 + Math.floor(col / 26)) + String.fromCharCode(65 + (col % 26))
}
const rowLabelNum = (row: number) => String(row + 1)

const TEAM_CLASS: Record<string, string> = {
  'Grand Army of the Republic': 'team-gar',
  'Confederacy of Independent Systems': 'team-cis',
}

let state = GameState.create()

const gridContainer = document.getElementById('grid-container') as HTMLDivElement
const colLabelsEl   = document.getElementById('col-labels')    as HTMLDivElement
const rowLabelsEl   = document.getElementById('row-labels')    as HTMLDivElement
const statusEl      = document.getElementById('status')        as HTMLParagraphElement
const turnCounterEl = document.getElementById('turn-counter')  as HTMLParagraphElement

const renderLabels = (): void => {
  colLabelsEl.innerHTML = ''
  for (let col = 0; col < GRID_COLS; col++) {
    const el = document.createElement('div')
    el.className = 'col-label'
    el.textContent = colLabelChar(col)
    colLabelsEl.appendChild(el)
  }

  const totalH = (GRID_ROWS - 1) * HEX_V_STEP + HEX_H
  rowLabelsEl.style.height = `${totalH}px`
  rowLabelsEl.innerHTML = ''
  for (let row = 0; row < GRID_ROWS; row++) {
    const el = document.createElement('div')
    el.className = 'row-label'
    el.textContent = rowLabelNum(row)
    el.style.top = `${row * HEX_V_STEP + HEX_H / 2}px`
    rowLabelsEl.appendChild(el)
  }
}

const renderGrid = (s: GameState): void => {
  const active = s.activePlayer
  const adjacentSet = new Set(
    getAdjacentCells(s.grid, active.position).map(c => `${c.position.row},${c.position.col}`)
  )

  // Build a map of cell -> players on that cell
  const playersByCell = new Map<string, typeof s.players>()
  for (const player of s.players) {
    const key = `${player.position.row},${player.position.col}`
    const list = playersByCell.get(key) ?? []
    list.push(player)
    playersByCell.set(key, list)
  }

  gridContainer.style.width  = `${GRID_COLS * HEX_W + ODD_OFFSET}px`
  gridContainer.style.height = `${(GRID_ROWS - 1) * HEX_V_STEP + HEX_H}px`
  gridContainer.innerHTML = ''

  for (let row = 0; row < s.grid.length; row++) {
    for (let col = 0; col < s.grid[row].length; col++) {
      const cell = s.grid[row][col]
      const el   = document.createElement('div')
      el.className       = 'cell'
      el.dataset['row']  = String(row)
      el.dataset['col']  = String(col)
      el.style.left      = `${col * HEX_W + (row % 2 === 1 ? ODD_OFFSET : 0)}px`
      el.style.top       = `${row * HEX_V_STEP}px`

      el.classList.add(`cell-${cell.cellValue}`)

      const cellKey = `${row},${col}`
      const playersHere = playersByCell.get(cellKey)

      if (playersHere && playersHere.length > 0) {
        const isActive = playersHere.some(p => p.id === active.id)
        const teamClass = TEAM_CLASS[playersHere[0].team]
        el.classList.add('occupied', teamClass)
        if (isActive) el.classList.add('active-player')

        const marker = document.createElement('span')
        marker.className = 'player-marker'
        marker.textContent = playersHere.length > 1 ? `▲${playersHere.length}` : '▲'
        el.appendChild(marker)
      } else if (adjacentSet.has(cellKey)) {
        el.classList.add('adjacent')
      }

      gridContainer.appendChild(el)
    }
  }

  statusEl.textContent = s.lastMessage
  statusEl.className   = s.status === 'error' ? 'error' : ''
  const ap = s.activePlayer
  turnCounterEl.textContent = `Turn ${s.turn} · ${ap.name} · ${posLabel(ap.position)}`
}

gridContainer.addEventListener('click', (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const cell = target.closest('.cell') as HTMLElement | null
  if (!cell) return

  const targetPos: Position = {
    row: Number(cell.dataset['row']),
    col: Number(cell.dataset['col']),
  }

  const result = state.applyMove(targetPos)
  if (result.ok) {
    state = result.state
    renderGrid(state)
    const prevPlayer = state.players[(state.activePlayerIndex - 1 + state.players.length) % state.players.length]
    exportTurnCSV(posLabel(prevPlayer.position), state.turn - 1)
  } else {
    statusEl.textContent = result.reason
    statusEl.className   = 'error'
  }
})

renderLabels()
renderGrid(state)
