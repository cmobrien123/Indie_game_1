import { describe, it, expect } from 'vitest'
import { Player } from '../../src/types/game'

describe('Player', () => {
  it('stores id, name, team, and position', () => {
    const p = new Player(0, 'Clone Trooper 1', 'Grand Army of the Republic', { row: 5, col: 10 })
    expect(p.id).toBe(0)
    expect(p.name).toBe('Clone Trooper 1')
    expect(p.team).toBe('Grand Army of the Republic')
    expect(p.position).toEqual({ row: 5, col: 10 })
  })

  it('defensive-copies the position on construction', () => {
    const pos = { row: 1, col: 2 }
    const p = new Player(0, 'Test', 'Grand Army of the Republic', pos)
    pos.row = 99
    expect(p.position.row).toBe(1)
  })

  describe('moveTo', () => {
    it('updates the position', () => {
      const p = new Player(0, 'Test', 'Grand Army of the Republic', { row: 0, col: 0 })
      p.moveTo({ row: 3, col: 4 })
      expect(p.position).toEqual({ row: 3, col: 4 })
    })
  })

  describe('isEnemyOf', () => {
    it('returns true for different teams', () => {
      const a = new Player(0, 'CT1', 'Grand Army of the Republic', { row: 0, col: 0 })
      const b = new Player(1, 'BD1', 'Confederacy of Independent Systems', { row: 0, col: 0 })
      expect(a.isEnemyOf(b)).toBe(true)
    })

    it('returns false for same team', () => {
      const a = new Player(0, 'CT1', 'Grand Army of the Republic', { row: 0, col: 0 })
      const b = new Player(1, 'CT2', 'Grand Army of the Republic', { row: 1, col: 1 })
      expect(a.isEnemyOf(b)).toBe(false)
    })
  })

  describe('isAt', () => {
    it('returns true when position matches', () => {
      const p = new Player(0, 'Test', 'Grand Army of the Republic', { row: 5, col: 10 })
      expect(p.isAt({ row: 5, col: 10 })).toBe(true)
    })

    it('returns false when position differs', () => {
      const p = new Player(0, 'Test', 'Grand Army of the Republic', { row: 5, col: 10 })
      expect(p.isAt({ row: 5, col: 11 })).toBe(false)
    })
  })
})
