import { describe, it, expect } from 'vitest'
import { createGameState, applyMove } from '../../src/api/game-state'

// CSV grid_map_with_plannets.csv (header skipped):
// Row 0: all 0s except cols 22,23,24 which are 2,2,2
// Row 1: all 0s except cols 22,23,24 which are 2,3,2
// First accessible cell: (0,22) value 2.
// From (0,22) even row hex neighbours:
//   E(0,23)=2✓, W(0,21)=0✗, SE(1,22)=2✓, SW(1,21)=0✗, NE/NW out of bounds.

describe('createGameState', () => {
  it('places the player at the first accessible cell', () => {
    const state = createGameState()
    expect(state.playerPos).toEqual({ row: 0, col: 22 })
  })

  it('marks the starting cell as occupied', () => {
    const state = createGameState()
    expect(state.grid[0][22].isOccupied).toBe(true)
  })

  it('starts on turn 1', () => {
    const state = createGameState()
    expect(state.turn).toBe(1)
  })

  it('shows nearest planet message since start is value 2', () => {
    const state = createGameState()
    expect(state.grid[0][22].cellValue).toBe(2)
    expect(state.lastMessage).toMatch(/Nearest planet/)
  })

  it('marks value-0 cells as inaccessible and value-3 as inaccessible', () => {
    const state = createGameState()
    expect(state.grid[0][0].accessible).toBe(false)  // value 0
    expect(state.grid[1][23].accessible).toBe(false)  // value 3
  })
})

describe('applyMove', () => {
  it('returns ok:true on a valid accessible move', () => {
    const state = createGameState()
    // E from (0,22) → (0,23) value 2, accessible
    const result = applyMove(state, { row: 0, col: 23 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.turn).toBe(2)
      expect(result.state.playerPos).toEqual({ row: 0, col: 23 })
    }
  })

  it('shows nearest planet message when landing on value 2', () => {
    const state = createGameState()
    const result = applyMove(state, { row: 0, col: 23 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.lastMessage).toMatch(/Nearest planet/)
    }
  })

  it('returns ok:false for a non-adjacent move', () => {
    const state = createGameState()
    const result = applyMove(state, { row: 5, col: 5 })
    expect(result.ok).toBe(false)
  })

  it('returns ok:false when the adjacent target is value 0', () => {
    const state = createGameState()
    // W from (0,22) → (0,21) which is value 0
    const result = applyMove(state, { row: 0, col: 21 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/blocked/)
    }
  })

  it('does not mutate the original state', () => {
    const state = createGameState()
    applyMove(state, { row: 0, col: 23 })
    expect(state.playerPos).toEqual({ row: 0, col: 22 })
    expect(state.turn).toBe(1)
  })
})
