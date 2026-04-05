import type { Cell, Grid, Position } from '../types/game'
import type { CellMap } from './access-map'
import { CELL_MAP } from './access-map'

export const GRID_ROWS = CELL_MAP.length
export const GRID_COLS = CELL_MAP[0].length

export const createGrid = (
  rows: number = GRID_ROWS,
  cols: number = GRID_COLS,
  cellMap?: CellMap
): Grid => {
  const grid: Grid = []
  for (let row = 0; row < rows; row++) {
    const rowCells: Cell[] = []
    for (let col = 0; col < cols; col++) {
      const cellValue = cellMap ? (cellMap[row]?.[col] ?? 0) : 1
      const accessible = cellValue === 1 || cellValue === 2
      rowCells.push({ position: { row, col }, accessible, cellValue })
    }
    grid.push(rowCells)
  }
  return grid
}

// Odd-r offset hex grid (pointy-top hexagons, odd rows shifted right by half a cell).
// Returns the 6 neighbor offsets for a cell in the given row.
export const getHexNeighborOffsets = (row: number): Position[] => {
  if (row % 2 === 0) {
    return [
      { row: 0,  col: 1  }, // E
      { row: 0,  col: -1 }, // W
      { row: -1, col: 0  }, // NE
      { row: -1, col: -1 }, // NW
      { row: 1,  col: 0  }, // SE
      { row: 1,  col: -1 }, // SW
    ]
  }
  return [
    { row: 0,  col: 1  }, // E
    { row: 0,  col: -1 }, // W
    { row: -1, col: 1  }, // NE
    { row: -1, col: 0  }, // NW
    { row: 1,  col: 1  }, // SE
    { row: 1,  col: 0  }, // SW
  ]
}

// Returns in-bounds, accessible hex neighbours — i.e. the valid move targets from pos.
export const getAdjacentCells = (grid: Grid, pos: Position): Cell[] => {
  return getHexNeighborOffsets(pos.row)
    .map(offset => ({ row: pos.row + offset.row, col: pos.col + offset.col }))
    .filter(p => p.row >= 0 && p.row < grid.length && p.col >= 0 && p.col < grid[0].length)
    .map(p => grid[p.row][p.col])
    .filter(cell => cell.accessible)
}
