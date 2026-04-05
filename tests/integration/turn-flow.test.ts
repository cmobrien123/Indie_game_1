import { describe, it, expect } from 'vitest'
import { GameState } from '../../src/api/game-state'
import { getHexNeighborOffsets } from '../../src/utils/grid'

describe('multi-turn flow', () => {
  it('cycles through players across turns', () => {
    let state = GameState.create()
    expect(state.activePlayerIndex).toBe(0)

    const p0 = state.players[0]
    const offsets = getHexNeighborOffsets(p0.position.row)
    let moved = false
    for (const off of offsets) {
      const target = { row: p0.position.row + off.row, col: p0.position.col + off.col }
      const cell = state.grid[target.row]?.[target.col]
      if (cell?.accessible) {
        const result = state.applyMove(target)
        if (result.ok) {
          state = result.state
          moved = true
          break
        }
      }
    }
    expect(moved).toBe(true)
    expect(state.activePlayerIndex).toBe(1)
    expect(state.turn).toBe(2)
  })

  it('wraps active player index back to 0 after all players move', () => {
    let state = GameState.create()
    const numPlayers = state.players.length

    for (let i = 0; i < numPlayers; i++) {
      const player = state.players[state.activePlayerIndex]
      const { row, col } = player.position
      const offsets = getHexNeighborOffsets(row)

      let moved = false
      for (const off of offsets) {
        const target = { row: row + off.row, col: col + off.col }
        const cell = state.grid[target.row]?.[target.col]
        if (cell?.accessible) {
          const result = state.applyMove(target)
          if (result.ok) {
            state = result.state
            moved = true
            break
          }
        }
      }
      expect(moved).toBe(true)
    }

    expect(state.activePlayerIndex).toBe(0)
    expect(state.turn).toBe(numPlayers + 1)
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
        expect(state.activePlayerIndex).toBe(0)
        break
      }
    }
  })
})
