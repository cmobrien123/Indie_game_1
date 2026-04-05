import { describe, it, expect } from 'vitest'
import { generateTurnCSV } from '../../src/utils/csv-export'

describe('generateTurnCSV', () => {
  it('produces a header row followed by a data row', () => {
    const lines = generateTurnCSV('B3', 4).split('\n')
    expect(lines[0]).toBe('turns_passed,cell')
    expect(lines[1]).toBe('4,B3')
  })

  it('contains exactly two lines', () => {
    expect(generateTurnCSV('A1', 1).split('\n').length).toBe(2)
  })

  it('reflects the correct cell label', () => {
    expect(generateTurnCSV('J10', 99)).toContain('J10')
  })

  it('reflects the correct turns-passed value', () => {
    expect(generateTurnCSV('A1', 7)).toContain('7')
  })
})
