import { describe, it, expect } from 'vitest'
import { createGrid, getAdjacentCells, GRID_ROWS, GRID_COLS } from '../../src/utils/grid'
import { parseCellMap } from '../../src/utils/access-map'

// Small 3x3 cell map for isolated tests: values 0, 1, 2, 3
const SMALL_MAP = parseCellMap('1,2,0\n1,1,3\n0,2,1')

describe('createGrid', () => {
  it('creates a grid matching the cell map dimensions', () => {
    const grid = createGrid()
    expect(grid.length).toBe(GRID_ROWS)
    expect(grid[0].length).toBe(GRID_COLS)
  })

  it('stores cellValue from the map', () => {
    const grid = createGrid(3, 3, SMALL_MAP)
    expect(grid[0][0].cellValue).toBe(1)
    expect(grid[0][1].cellValue).toBe(2)
    expect(grid[0][2].cellValue).toBe(0)
    expect(grid[1][2].cellValue).toBe(3)
  })

  it('marks values 1 and 2 as accessible, 0 and 3 as inaccessible', () => {
    const grid = createGrid(3, 3, SMALL_MAP)
    expect(grid[0][0].accessible).toBe(true)  // value 1
    expect(grid[0][1].accessible).toBe(true)  // value 2
    expect(grid[0][2].accessible).toBe(false) // value 0
    expect(grid[1][2].accessible).toBe(false) // value 3
  })

  it('creates cells with correct positions', () => {
    const grid = createGrid(3, 3)
    expect(grid[2][1].position).toEqual({ row: 2, col: 1 })
  })

  it('creates cells without player-specific state', () => {
    const grid = createGrid(3, 3)
    expect(grid.every(row => row.every(cell => 'accessible' in cell))).toBe(true)
  })
})

describe('getAdjacentCells — hex grid (odd-r offset, pointy-top)', () => {
  it('returns 6 neighbours for an interior cell (all accessible)', () => {
    // Fully accessible grid (no map = all value 1)
    const grid = createGrid(10, 10)
    expect(getAdjacentCells(grid, { row: 5, col: 5 }).length).toBe(6)
  })

  it('excludes inaccessible neighbours (value 0 and value 3)', () => {
    const grid = createGrid(3, 3, SMALL_MAP)
    // (0,1) even row: E→(0,2) value 0, W→(0,0) value 1, SE→(1,1) value 1, SW→(1,0) value 1
    const neighbours = getAdjacentCells(grid, { row: 0, col: 1 })
    expect(neighbours.every(c => c.accessible)).toBe(true)
    expect(neighbours.find(c => c.position.col === 2)).toBeUndefined()
  })
})

describe('parseCellMap', () => {
  it('skips the header row when skipHeader is true', () => {
    const map = parseCellMap('col1,col2,col3\n1,0,2\n3,1,0', true)
    expect(map.length).toBe(2)
    expect(map[0]).toEqual([1, 0, 2])
  })

  it('preserves all rows when skipHeader is false', () => {
    const map = parseCellMap('1,0\n0,1')
    expect(map.length).toBe(2)
  })

  it('returns numeric values, not booleans', () => {
    const map = parseCellMap('0,1,2,3')
    expect(map[0]).toEqual([0, 1, 2, 3])
  })
})
