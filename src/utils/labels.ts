import type { Position } from '../types/game'

export const colLabel = (col: number): string => {
  if (col < 26) return String.fromCharCode(65 + col)
  return String.fromCharCode(64 + Math.floor(col / 26)) + String.fromCharCode(65 + (col % 26))
}

export const rowLabel = (row: number): string => String(row + 1)

export const posLabel = (pos: Position): string => `${colLabel(pos.col)}${rowLabel(pos.row)}`
