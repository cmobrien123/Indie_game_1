import type { Position } from '../types/game'
import { getHexNeighborOffsets } from './grid'

export const isValidMove = (current: Position, target: Position): boolean => {
  return getHexNeighborOffsets(current.row).some(
    offset =>
      current.row + offset.row === target.row &&
      current.col + offset.col === target.col
  )
}
