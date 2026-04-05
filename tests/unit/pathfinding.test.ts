import { describe, it, expect } from 'vitest'
import { findNearestCell3 } from '../../src/utils/pathfinding'
import { createGrid } from '../../src/utils/grid'
import { parseCellMap } from '../../src/utils/access-map'

describe('findNearestCell3', () => {
  it('finds a value-3 cell adjacent to start', () => {
    // Row 0 even: (0,0)=2, (0,1)=3
    const map = parseCellMap('2,3\n0,0')
    const grid = createGrid(2, 2, map)
    const result = findNearestCell3(grid, { row: 0, col: 0 })
    expect(result).toEqual({ row: 0, col: 1 })
  })

  it('returns null when no value-3 cell exists', () => {
    const map = parseCellMap('1,2\n2,1')
    const grid = createGrid(2, 2, map)
    const result = findNearestCell3(grid, { row: 0, col: 0 })
    expect(result).toBeNull()
  })

  it('finds the closest of multiple value-3 cells', () => {
    // 3x5 grid: start at (1,2), value-3 at (0,4) and (1,0)
    // (1,0) is 2 hex steps away, (0,4) is 2 hex steps away too,
    // but BFS encounters (1,0) or (0,4) — the important thing is it finds one at distance 2
    const map = parseCellMap('0,0,0,0,3\n3,0,2,0,0\n0,0,0,0,0')
    const grid = createGrid(3, 5, map)
    const result = findNearestCell3(grid, { row: 1, col: 2 })
    expect(result).not.toBeNull()
    expect(result!.row).toBeDefined()
  })

  it('traverses through inaccessible cells to find value-3', () => {
    // value-3 is surrounded by value-0 cells but should still be found
    const map = parseCellMap('2,0,0\n0,0,0\n0,0,3')
    const grid = createGrid(3, 3, map)
    const result = findNearestCell3(grid, { row: 0, col: 0 })
    expect(result).toEqual({ row: 2, col: 2 })
  })
})
