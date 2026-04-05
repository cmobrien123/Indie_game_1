import type { Position } from '../types/game'

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
