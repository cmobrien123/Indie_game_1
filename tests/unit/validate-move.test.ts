import { describe, it, expect } from 'vitest'
import { isValidMove } from '../../src/utils/validate-move'

// Using even row (row=4) and odd row (row=5) to test both offset variants.

describe('isValidMove — even row (row=4)', () => {
  it('allows E  (0, +1)', () => expect(isValidMove({ row: 4, col: 4 }, { row: 4, col: 5 })).toBe(true))
  it('allows W  (0, -1)', () => expect(isValidMove({ row: 4, col: 4 }, { row: 4, col: 3 })).toBe(true))
  it('allows NE (-1, 0)', () => expect(isValidMove({ row: 4, col: 4 }, { row: 3, col: 4 })).toBe(true))
  it('allows NW (-1,-1)', () => expect(isValidMove({ row: 4, col: 4 }, { row: 3, col: 3 })).toBe(true))
  it('allows SE (+1, 0)', () => expect(isValidMove({ row: 4, col: 4 }, { row: 5, col: 4 })).toBe(true))
  it('allows SW (+1,-1)', () => expect(isValidMove({ row: 4, col: 4 }, { row: 5, col: 3 })).toBe(true))
})

describe('isValidMove — odd row (row=5)', () => {
  it('allows E  (0, +1)', () => expect(isValidMove({ row: 5, col: 4 }, { row: 5, col: 5 })).toBe(true))
  it('allows W  (0, -1)', () => expect(isValidMove({ row: 5, col: 4 }, { row: 5, col: 3 })).toBe(true))
  it('allows NE (-1,+1)', () => expect(isValidMove({ row: 5, col: 4 }, { row: 4, col: 5 })).toBe(true))
  it('allows NW (-1, 0)', () => expect(isValidMove({ row: 5, col: 4 }, { row: 4, col: 4 })).toBe(true))
  it('allows SE (+1,+1)', () => expect(isValidMove({ row: 5, col: 4 }, { row: 6, col: 5 })).toBe(true))
  it('allows SW (+1, 0)', () => expect(isValidMove({ row: 5, col: 4 }, { row: 6, col: 4 })).toBe(true))
})

describe('isValidMove — invalid moves', () => {
  it('rejects staying in place', () => expect(isValidMove({ row: 4, col: 4 }, { row: 4, col: 4 })).toBe(false))
  it('rejects a 2-step jump',    () => expect(isValidMove({ row: 4, col: 4 }, { row: 2, col: 4 })).toBe(false))
  it('rejects a far diagonal',   () => expect(isValidMove({ row: 4, col: 4 }, { row: 6, col: 6 })).toBe(false))
  // (+1,+1) is not a valid hex neighbour for an even row
  it('rejects (+1,+1) from even row', () => expect(isValidMove({ row: 4, col: 4 }, { row: 5, col: 5 })).toBe(false))
  // (-1,-1) is not a valid hex neighbour for an odd row
  it('rejects (-1,-1) from odd row',  () => expect(isValidMove({ row: 5, col: 4 }, { row: 4, col: 3 })).toBe(false))
})
