import { describe, it, expect, vi } from 'vitest'
import { detectBattles, autoClaimUnowned, rollDice } from '../../src/utils/battle'
import { Player, Plannet } from '../../src/types/game'

const makePlayer = (id: number, team: string, row: number, col: number): Player => {
  const p = new Player(id, `P${id}`, team as any, { row, col })
  p.infantry = 10
  return p
}

const makePlannet = (
  index: number,
  name: string,
  owner: string | null,
  orbit: { row: number; col: number }[],
): Plannet =>
  new Plannet(name, { row: 0, col: 0 }, orbit, owner as any, { Money: 0, RawMaterials: 0, Fuel: 0, ForceSensitivity: 0 })

describe('detectBattles', () => {
  it('returns empty when no enemies in orbit', () => {
    const players = [makePlayer(0, 'Grand Army of the Republic', 5, 5)]
    const plannets = [makePlannet(0, 'TestPlanet', 'Grand Army of the Republic', [{ row: 5, col: 5 }])]
    expect(detectBattles(players, plannets)).toEqual([])
  })

  it('detects battle when enemy is in orbit of owned planet', () => {
    const players = [
      makePlayer(0, 'Confederacy of Independent Systems', 5, 5),
    ]
    const plannets = [makePlannet(0, 'TestPlanet', 'Grand Army of the Republic', [{ row: 5, col: 5 }])]
    const battles = detectBattles(players, plannets)
    expect(battles.length).toBe(1)
    expect(battles[0].attackingTeam).toBe('Confederacy of Independent Systems')
    expect(battles[0].defendingTeam).toBe('Grand Army of the Republic')
    expect(battles[0].attackerDiceSides).toBe(10) // infantry
    expect(battles[0].defenderDiceSides).toBe(8) // 0 defenders + 8 bonus
  })

  it('aggregates multiple attackers from same team', () => {
    const players = [
      makePlayer(0, 'Confederacy of Independent Systems', 5, 5),
      makePlayer(1, 'Confederacy of Independent Systems', 5, 6),
    ]
    const plannets = [makePlannet(0, 'TestPlanet', 'Grand Army of the Republic', [{ row: 5, col: 5 }, { row: 5, col: 6 }])]
    const battles = detectBattles(players, plannets)
    expect(battles.length).toBe(1)
    expect(battles[0].attackerPlayerIds).toEqual([0, 1])
    expect(battles[0].attackerDiceSides).toBe(20) // 10 + 10
  })

  it('includes defender infantry + 8 bonus', () => {
    const players = [
      makePlayer(0, 'Confederacy of Independent Systems', 5, 5),
      makePlayer(1, 'Grand Army of the Republic', 5, 6),
    ]
    const plannets = [makePlannet(0, 'TestPlanet', 'Grand Army of the Republic', [{ row: 5, col: 5 }, { row: 5, col: 6 }])]
    const battles = detectBattles(players, plannets)
    expect(battles[0].defenderDiceSides).toBe(18) // 10 infantry + 8 bonus
  })

  it('handles unowned planet with both teams — no defender bonus', () => {
    const players = [
      makePlayer(0, 'Grand Army of the Republic', 5, 5),
      makePlayer(1, 'Confederacy of Independent Systems', 5, 6),
    ]
    const plannets = [makePlannet(0, 'TestPlanet', null, [{ row: 5, col: 5 }, { row: 5, col: 6 }])]
    const battles = detectBattles(players, plannets)
    expect(battles.length).toBe(1)
    // No +8 bonus for either side
    expect(battles[0].attackerDiceSides).toBe(10)
    expect(battles[0].defenderDiceSides).toBe(10)
  })

  it('returns no battle for unowned planet with only one team', () => {
    const players = [makePlayer(0, 'Grand Army of the Republic', 5, 5)]
    const plannets = [makePlannet(0, 'TestPlanet', null, [{ row: 5, col: 5 }])]
    expect(detectBattles(players, plannets)).toEqual([])
  })
})

describe('autoClaimUnowned', () => {
  it('claims unowned planet for single team in orbit', () => {
    const players = [makePlayer(0, 'Grand Army of the Republic', 5, 5)]
    const plannets = [makePlannet(0, 'TestPlanet', null, [{ row: 5, col: 5 }])]
    autoClaimUnowned(players, plannets)
    expect(plannets[0].currentOwner).toBe('Grand Army of the Republic')
  })

  it('does not claim if both teams are in orbit', () => {
    const players = [
      makePlayer(0, 'Grand Army of the Republic', 5, 5),
      makePlayer(1, 'Confederacy of Independent Systems', 5, 6),
    ]
    const plannets = [makePlannet(0, 'TestPlanet', null, [{ row: 5, col: 5 }, { row: 5, col: 6 }])]
    autoClaimUnowned(players, plannets)
    expect(plannets[0].currentOwner).toBeNull()
  })

  it('does not claim if no players in orbit', () => {
    const players = [makePlayer(0, 'Grand Army of the Republic', 99, 99)]
    const plannets = [makePlannet(0, 'TestPlanet', null, [{ row: 5, col: 5 }])]
    autoClaimUnowned(players, plannets)
    expect(plannets[0].currentOwner).toBeNull()
  })
})

describe('rollDice', () => {
  it('returns values within range', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDice(6)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(6)
    }
  })

  it('returns 0 for 0 sides', () => {
    expect(rollDice(0)).toBe(0)
  })
})
