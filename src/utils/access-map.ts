import csvText from '../../game/csvs/grid_map_with_plannets.csv'

export type CellMap = number[][]

// Parses a CSV of numeric cell values into a 2-D number array.
// When skipHeader is true the first row is dropped (e.g. column index headers).
export const parseCellMap = (csv: string, skipHeader = false): CellMap => {
  const lines = csv.trim().split('\n')
  const dataLines = skipHeader ? lines.slice(1) : lines
  return dataLines.map(line => line.split(',').map(token => Number(token.trim()) || 0))
}

export const CELL_MAP: CellMap = parseCellMap(csvText, true)
