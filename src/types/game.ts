export interface Position {
  row: number
  col: number
}

export interface Cell {
  position: Position
  isOccupied: boolean
  accessible: boolean
  cellValue: number
}

export type Grid = Cell[][]

export interface GameState {
  grid: Grid
  playerPos: Position
  turn: number
  status: 'playing' | 'error'
  lastMessage: string
}

export type MoveResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string }
