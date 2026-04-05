import { describe, it, expect } from 'vitest'
import { createGameState, applyMove } from '../../src/api/game-state'

// Start at (0,22) value 2. Adjacent accessible cells:
// E(0,23)=2, SE(1,22)=2
// From (0,23) even row: E(0,24)=2, W(0,22), SE(1,23)=3✗, SW(1,22)=2

describe('multi-turn flow', () => {
  it('correctly tracks position across multiple accessible turns', () => {
    let state = createGameState()

    // E: (0,22) → (0,23) value 2
    let result = applyMove(state, { row: 0, col: 23 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    state = result.state

    // E: (0,23) → (0,24) value 2
    result = applyMove(state, { row: 0, col: 24 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    state = result.state

    expect(state.playerPos).toEqual({ row: 0, col: 24 })
    expect(state.turn).toBe(3)

    const occupied = state.grid.flat().filter(c => c.isOccupied)
    expect(occupied.length).toBe(1)
    expect(occupied[0].position).toEqual({ row: 0, col: 24 })
  })

  it('rejects a move to an adjacent value-3 cell', () => {
    let state = createGameState()

    // E to (0,23)
    const step = applyMove(state, { row: 0, col: 23 })
    expect(step.ok).toBe(true)
    if (!step.ok) return
    state = step.state

    // SE from (0,23) even row → (1,23) which is value 3
    const blocked = applyMove(state, { row: 1, col: 23 })
    expect(blocked.ok).toBe(false)
    expect(state.playerPos).toEqual({ row: 0, col: 23 })
  })

  it('shows nearest planet on value-2 cells', () => {
    const state = createGameState()
    // Start is value 2, should have planet message
    expect(state.lastMessage).toMatch(/Nearest planet/)

    // Move to another value-2 cell
    const result = applyMove(state, { row: 0, col: 23 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.lastMessage).toMatch(/Nearest planet/)
    }
  })
})
