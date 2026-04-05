import type { GameState, Grid, MoveResult, Position } from '../types/game'
import { createGrid, GRID_ROWS, GRID_COLS } from '../utils/grid'
import { isValidMove } from '../utils/validate-move'
import { CELL_MAP } from '../utils/access-map'
import { findNearestCell3 } from '../utils/pathfinding'
import { posLabel } from '../utils/labels'

const findFirstAccessible = (grid: Grid): Position => {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col].accessible) return { row, col }
    }
  }
  return { row: 0, col: 0 }
}

const buildMessage = (grid: Grid, pos: Position, turn: number): string => {
  const cell = grid[pos.row][pos.col]
  if (cell.cellValue === 2) {
    const nearest = findNearestCell3(grid, pos)
    if (nearest) {
      return `Turn ${turn} — Nearest planet: ${posLabel(nearest)}`
    }
  }
  return `Turn ${turn} — click an adjacent cell to move`
}

export const createGameState = (): GameState => {
  const grid = createGrid(GRID_ROWS, GRID_COLS, CELL_MAP)
  const startPos = findFirstAccessible(grid)
  grid[startPos.row][startPos.col].isOccupied = true
  return {
    grid,
    playerPos: startPos,
    turn: 1,
    status: 'playing',
    lastMessage: buildMessage(grid, startPos, 1),
  }
}

const cloneGrid = (state: GameState) => {
  return state.grid.map(row => row.map(cell => ({ ...cell })))
}

export const applyMove = (state: GameState, targetPos: Position): MoveResult => {
  if (!isValidMove(state.playerPos, targetPos)) {
    return {
      ok: false,
      reason: 'Invalid move — you can only step to an adjacent cell',
    }
  }

  const targetCell = state.grid[targetPos.row]?.[targetPos.col]
  if (!targetCell?.accessible) {
    return {
      ok: false,
      reason: 'That cell is blocked — you cannot move there',
    }
  }

  const newGrid = cloneGrid(state)
  newGrid[state.playerPos.row][state.playerPos.col].isOccupied = false
  newGrid[targetPos.row][targetPos.col].isOccupied = true

  const nextTurn = state.turn + 1
  return {
    ok: true,
    state: {
      grid: newGrid,
      playerPos: targetPos,
      turn: nextTurn,
      status: 'playing',
      lastMessage: buildMessage(newGrid, targetPos, nextTurn),
    },
  }
}
