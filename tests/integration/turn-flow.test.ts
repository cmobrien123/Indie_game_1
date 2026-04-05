import { describe, it, expect } from 'vitest'
import { GameState } from '../../src/api/game-state'
import { getHexNeighborOffsets } from '../../src/utils/grid'

/** Move the active player one step in any valid direction. */
const moveOnce = (state: GameState): GameState | null => {
  const p = state.activePlayer
  const offsets = getHexNeighborOffsets(p.position.row)
  for (const off of offsets) {
    const target = { row: p.position.row + off.row, col: p.position.col + off.col }
    const cell = state.grid[target.row]?.[target.col]
    if (cell?.accessible) {
      const result = state.applyMove(target)
      if (result.ok) return result.state
    }
  }
  return null
}

describe('multi-turn flow', () => {
  it('applyMove keeps the same active player (does not advance)', () => {
    let state = GameState.create()
    expect(state.activePlayerIndex).toBe(0)

    const moved = moveOnce(state)
    expect(moved).not.toBeNull()
    expect(moved!.activePlayerIndex).toBe(0)
    expect(moved!.turn).toBe(1)
  })

  it('applyMove consumes 1 fuel per step', () => {
    const state = GameState.create()
    const fuelBefore = state.teamFuel

    const moved = moveOnce(state)
    expect(moved).not.toBeNull()
    expect(moved!.teamFuel).toBe(fuelBefore - 1)
  })

  it('applyMove fails when team has no fuel', () => {
    let state = GameState.create()
    // Drain all fuel
    const team = state.activePlayer.team
    state.teamResources[team].Fuel = 0

    const p = state.activePlayer
    const offsets = getHexNeighborOffsets(p.position.row)
    for (const off of offsets) {
      const target = { row: p.position.row + off.row, col: p.position.col + off.col }
      const cell = state.grid[target.row]?.[target.col]
      if (cell?.accessible) {
        const result = state.applyMove(target)
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.reason).toMatch(/fuel/i)
        break
      }
    }
  })

  it('endPlayerTurn advances to next player', () => {
    const state = GameState.create()
    expect(state.activePlayerIndex).toBe(0)

    const next = state.endPlayerTurn()
    expect(next.activePlayerIndex).toBe(1)
    expect(next.turn).toBe(1) // still same turn
  })

  it('turn increments after all players end their turns', () => {
    let state = GameState.create()
    const numPlayers = state.players.length

    for (let i = 0; i < numPlayers; i++) {
      // Optionally move once, then end turn
      const moved = moveOnce(state)
      if (moved) state = moved
      state = state.endPlayerTurn()
    }

    expect(state.activePlayerIndex).toBe(0)
    expect(state.turn).toBe(2)
  })

  it('rejects a move to a cell with an enemy unit', () => {
    const state = GameState.create()
    const p0 = state.players[0]
    const offsets = getHexNeighborOffsets(p0.position.row)

    for (const off of offsets) {
      const target = { row: p0.position.row + off.row, col: p0.position.col + off.col }
      const cell = state.grid[target.row]?.[target.col]
      if (cell?.accessible) {
        state.players[3].moveTo(target) // enemy
        const result = state.applyMove(target)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.reason).toMatch(/enemy/)
        }
        break
      }
    }
  })
})
