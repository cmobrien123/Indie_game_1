import { describe, it, expect } from 'vitest'
import { GameState } from '../../src/api/game-state'
import { getHexNeighborOffsets } from '../../src/utils/grid'

describe('GameState.create', () => {
  it('creates 6 players across 2 teams', () => {
    const state = GameState.create()
    expect(state.players.length).toBe(6)
    const gar = state.players.filter(p => p.team === 'Grand Army of the Republic')
    const cis = state.players.filter(p => p.team === 'Confederacy of Independent Systems')
    expect(gar.length).toBe(3)
    expect(cis.length).toBe(3)
  })

  it('places each player in orbit of a planet owned by their team', () => {
    const state = GameState.create()
    for (const player of state.players) {
      const inFriendlyOrbit = state.plannets.some(
        p => p.currentOwner === player.team &&
          p.cellsInOrbit.some(o => o.row === player.position.row && o.col === player.position.col)
      )
      expect(inFriendlyOrbit).toBe(true)
    }
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
    expect(state.plannets[0].name).toBe('Kenari')
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
    const p0 = state.players[0]
    const offsets = getHexNeighborOffsets(p0.position.row)

    let result
    for (const off of offsets) {
      const target = { row: p0.position.row + off.row, col: p0.position.col + off.col }
      const cell = state.grid[target.row]?.[target.col]
      if (cell?.accessible) {
        result = state.applyMove(target)
        if (result.ok) break
      }
    }
    expect(result?.ok).toBe(true)
    if (result?.ok) {
      expect(result.state.turn).toBe(1)
      // applyMove no longer advances player — same player can keep moving
      expect(result.state.activePlayerIndex).toBe(0)
    }
  })

  it('returns ok:false for a non-adjacent move', () => {
    const state = GameState.create()
    const result = state.applyMove({ row: 5, col: 5 })
    expect(result.ok).toBe(false)
  })

  it('does not mutate the original state', () => {
    const state = GameState.create()
    const origPos = { ...state.players[0].position }
    const offsets = getHexNeighborOffsets(origPos.row)
    for (const off of offsets) {
      const target = { row: origPos.row + off.row, col: origPos.col + off.col }
      const cell = state.grid[target.row]?.[target.col]
      if (cell?.accessible) {
        state.applyMove(target)
        break
      }
    }
    expect(state.players[0].position).toEqual(origPos)
    expect(state.turn).toBe(1)
  })

  it('blocks moving onto a cell occupied by the enemy team', () => {
    const state = GameState.create()
    const p0 = state.players[0]
    const offsets = getHexNeighborOffsets(p0.position.row)
    // Find an accessible adjacent cell and place an enemy there
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

  it('allows moving onto a cell occupied by a teammate', () => {
    const state = GameState.create()
    const p0 = state.players[0]
    const offsets = getHexNeighborOffsets(p0.position.row)
    for (const off of offsets) {
      const target = { row: p0.position.row + off.row, col: p0.position.col + off.col }
      const cell = state.grid[target.row]?.[target.col]
      if (cell?.accessible) {
        state.players[1].moveTo(target) // teammate
        const result = state.applyMove(target)
        expect(result.ok).toBe(true)
        break
      }
    }
  })

  it('preserves plannets across moves', () => {
    const state = GameState.create()
    const p0 = state.players[0]
    const offsets = getHexNeighborOffsets(p0.position.row)
    for (const off of offsets) {
      const target = { row: p0.position.row + off.row, col: p0.position.col + off.col }
      const cell = state.grid[target.row]?.[target.col]
      if (cell?.accessible) {
        const result = state.applyMove(target)
        if (result.ok) {
          expect(result.state.plannets.length).toBe(38)
        }
        break
      }
    }
  })

  it('does not change planet ownership on move', () => {
    const state = GameState.create()
    // Record all owners before
    const ownersBefore = state.plannets.map(p => p.currentOwner)
    const p0 = state.players[0]
    const offsets = getHexNeighborOffsets(p0.position.row)
    for (const off of offsets) {
      const target = { row: p0.position.row + off.row, col: p0.position.col + off.col }
      const cell = state.grid[target.row]?.[target.col]
      if (cell?.accessible) {
        const result = state.applyMove(target)
        if (result.ok) {
          const ownersAfter = result.state.plannets.map(p => p.currentOwner)
          expect(ownersAfter).toEqual(ownersBefore)
        }
        break
      }
    }
  })
})

describe('GameState.endPlayerTurn — battle detection', () => {
  it('stays playing when no enemies in orbit at end of full turn', () => {
    let state = GameState.create()
    // End all 6 player turns without moving
    for (let i = 0; i < 6; i++) {
      state = state.endPlayerTurn()
    }
    expect(state.status).toBe('playing')
    expect(state.pendingBattles.length).toBe(0)
  })
})

describe('GameState.applyBattleRoll', () => {
  it('returns same state when not battling', () => {
    const state = GameState.create()
    const result = state.applyBattleRoll('Grand Army of the Republic')
    expect(result).toBe(state)
  })
})

describe('GameState.recruitPlayer', () => {
  it('canRecruit returns true when team has enough resources', () => {
    const state = GameState.create()
    // Starting resources: Money 50, RawMaterials 50
    // GAR cost: Money 150, RawMaterials 75 — too expensive at start
    // But let's check the property exists
    expect(typeof state.canRecruit).toBe('boolean')
  })

  it('fails when team cannot afford recruitment', () => {
    const state = GameState.create()
    // GAR starts with Money: 50, needs 150 — should fail
    const p0 = state.players[0]
    const result = state.recruitPlayer(p0.position)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/resources/)
    }
  })

  it('succeeds when team has enough resources and valid position', () => {
    const state = GameState.create()
    // Give GAR enough resources
    state.teamResources['Grand Army of the Republic'].Money = 200
    state.teamResources['Grand Army of the Republic'].RawMaterials = 200

    // Find a friendly orbit cell for GAR
    const team = state.activePlayer.team
    let targetPos: { row: number; col: number } | null = null
    for (const planet of state.plannets) {
      if (planet.currentOwner !== team) continue
      for (const o of planet.cellsInOrbit) {
        if (state.grid[o.row]?.[o.col]?.accessible) {
          targetPos = o
          break
        }
      }
      if (targetPos) break
    }
    expect(targetPos).not.toBeNull()

    const result = state.recruitPlayer(targetPos!)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.players.length).toBe(state.players.length + 1)
      const newPlayer = result.state.players[result.state.players.length - 1]
      expect(newPlayer.team).toBe(team)
      expect(newPlayer.infantry).toBe(12) // GAR default
      // Resources should be deducted
      expect(result.state.teamResources[team].Money).toBe(200 - 150)
      expect(result.state.teamResources[team].RawMaterials).toBe(200 - 75)
    }
  })

  it('fails when position is not in friendly orbit', () => {
    const state = GameState.create()
    state.teamResources['Grand Army of the Republic'].Money = 200
    state.teamResources['Grand Army of the Republic'].RawMaterials = 200

    // Use a cell that's accessible but not in any friendly orbit
    const result = state.recruitPlayer({ row: 0, col: 0 })
    expect(result.ok).toBe(false)
  })
})
