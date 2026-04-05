import { describe, it, expect } from 'vitest'
import { GameState } from '../../src/models/game-state'

// Starting positions:
// Clone Trooper 1: L32 → (31,11)
// Clone Trooper 2: S41 → (40,18)
// Clone Trooper 3: S30 → (29,18)
// Battle Droid 1: AC79 → (78,28)
// Battle Droid 2: X3 → (2,23)
// Battle Droid 3: AB12 → (11,27)

describe('GameState.create', () => {
  it('creates 6 players across 2 teams', () => {
    const state = GameState.create()
    expect(state.players.length).toBe(6)
    const gar = state.players.filter(p => p.team === 'Grand Army of the Republic')
    const cis = state.players.filter(p => p.team === 'Confederacy of Independent Systems')
    expect(gar.length).toBe(3)
    expect(cis.length).toBe(3)
  })

  it('places Clone Trooper 1 at L32', () => {
    const state = GameState.create()
    expect(state.players[0].position).toEqual({ row: 31, col: 11 })
  })

  it('places Battle Droid 2 at X3', () => {
    const state = GameState.create()
    expect(state.players[4].position).toEqual({ row: 2, col: 23 })
  })

  it('starts with player 0 as the active player', () => {
    const state = GameState.create()
    expect(state.activePlayerIndex).toBe(0)
  })

  it('starts on turn 1', () => {
    const state = GameState.create()
    expect(state.turn).toBe(1)
  })

  it('discovers plannets from the grid', () => {
    const state = GameState.create()
    expect(state.plannets.length).toBe(38)
    expect(state.plannets[0].name).toBe('Coruscant')
  })

  it('pre-assigns some plannets to teams', () => {
    const state = GameState.create()
    const garPlannets = state.plannets.filter(p => p.currentOwner === 'Grand Army of the Republic')
    const cisPlannets = state.plannets.filter(p => p.currentOwner === 'Confederacy of Independent Systems')
    expect(garPlannets.length).toBe(5)
    expect(cisPlannets.length).toBe(5)
  })

  it('marks value-0 cells as inaccessible and value-3 as inaccessible', () => {
    const state = GameState.create()
    expect(state.grid[0][0].accessible).toBe(false)  // value 0
    expect(state.grid[1][23].accessible).toBe(false)  // value 3
  })
})

describe('GameState.applyMove', () => {
  it('returns ok:true on a valid accessible move', () => {
    const state = GameState.create()
    // Clone Trooper 1 at (31,11), row 31 is odd → E neighbor is (31,12)
    const result = state.applyMove({ row: 31, col: 12 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.turn).toBe(2)
      expect(result.state.players[0].position).toEqual({ row: 31, col: 12 })
      expect(result.state.activePlayerIndex).toBe(1)
    }
  })

  it('returns ok:false for a non-adjacent move', () => {
    const state = GameState.create()
    const result = state.applyMove({ row: 5, col: 5 })
    expect(result.ok).toBe(false)
  })

  it('does not mutate the original state', () => {
    const state = GameState.create()
    state.applyMove({ row: 31, col: 12 })
    expect(state.players[0].position).toEqual({ row: 31, col: 11 })
    expect(state.turn).toBe(1)
  })

  it('blocks moving onto a cell occupied by the enemy team', () => {
    const state = GameState.create()
    state.players[4].moveTo({ row: 31, col: 12 })
    const result = state.applyMove({ row: 31, col: 12 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/enemy/)
    }
  })

  it('allows moving onto a cell occupied by a teammate', () => {
    const state = GameState.create()
    state.players[1].moveTo({ row: 31, col: 12 })
    const result = state.applyMove({ row: 31, col: 12 })
    expect(result.ok).toBe(true)
  })

  it('preserves plannets across moves', () => {
    const state = GameState.create()
    const result = state.applyMove({ row: 31, col: 12 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.plannets.length).toBe(38)
    }
  })
})
