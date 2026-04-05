import type { Grid, Position } from '../types/game'
import { getHexNeighborOffsets } from './grid'

// BFS across all in-bounds hex cells (not just accessible ones) to find the
// nearest cell with value 3. Returns its position, or null if none exists.
export const findNearestCell3 = (grid: Grid, start: Position): Position | null => {
  const rows = grid.length
  const cols = grid[0].length
  const visited = new Set<string>()
  const queue: Position[] = [start]
  visited.add(`${start.row},${start.col}`)

  while (queue.length > 0) {
    const pos = queue.shift()!
    if (grid[pos.row][pos.col].cellValue === 3) {
      return pos
    }
    for (const offset of getHexNeighborOffsets(pos.row)) {
      const nr = pos.row + offset.row
      const nc = pos.col + offset.col
      const key = `${nr},${nc}`
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key)) {
        visited.add(key)
        queue.push({ row: nr, col: nc })
      }
    }
  }
  return null
}
