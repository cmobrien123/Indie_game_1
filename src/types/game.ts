export interface Position {
  row: number
  col: number
}

export interface Cell {
  position: Position
  accessible: boolean
  cellValue: number
}

export type Grid = Cell[][]

export type TeamName = 'Grand Army of the Republic' | 'Confederacy of Independent Systems'
