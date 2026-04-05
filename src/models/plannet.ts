import type { Position, Grid, TeamName } from '../types/game'
import { getHexNeighborOffsets } from '../utils/grid'

const PLANNET_NAMES = [
  'Coruscant', 'Kamino', 'Geonosis', 'Naboo', 'Mustafar',
  'Kashyyyk', 'Utapau', 'Felucia', 'Mygeeto', 'Saleucami',
  'Christophsis', 'Ryloth', 'Cato Neimoidia', 'Mandalore', 'Dathomir',
  'Serenno', 'Sullust', 'Kamino Station', 'Bespin', 'Tatooine',
  'Alderaan', 'Corellia', 'Scarif', 'Jedha', 'Lothal',
  'Atollon', 'Kessel', 'Mon Cala', 'Anaxes', 'Umbara',
  'Rishi', 'Ord Mantell', 'Onderon', 'Zygerria', 'Florrum',
  'Hoth', 'Dagobah', 'Yavin IV',
]

const DEFAULT_RESOURCES: Record<string, number> = {
  credits: 100,
  fuel: 50,
  minerals: 30,
}

// Planet core indices (from discovery order) pre-assigned to each team.
// Republic starts near rows 29-40, cols 11-18 → cores 12,13,16,17,18
// CIS starts near rows 2-11, cols 23-28 and row 78+ → cores 0,3,4,31,34
const GAR_PLANETS = new Set([12, 13, 16, 17, 18])
const CIS_PLANETS = new Set([0, 3, 4, 31, 34])

export class Plannet {
  readonly name: string
  readonly cellLocation: Position
  readonly cellsInOrbit: Position[]
  currentOwner: TeamName | null
  resourceStats: Record<string, number>

  constructor(
    name: string,
    cellLocation: Position,
    cellsInOrbit: Position[],
    currentOwner: TeamName | null,
    resourceStats: Record<string, number>,
  ) {
    this.name = name
    this.cellLocation = { ...cellLocation }
    this.cellsInOrbit = cellsInOrbit.map(p => ({ ...p }))
    this.currentOwner = currentOwner
    this.resourceStats = { ...resourceStats }
  }

  static discoverAll(grid: Grid): Plannet[] {
    const plannets: Plannet[] = []
    let index = 0

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col].cellValue !== 3) continue

        const corePos: Position = { row, col }
        const orbit: Position[] = getHexNeighborOffsets(row)
          .map(off => ({ row: row + off.row, col: col + off.col }))
          .filter(p =>
            p.row >= 0 && p.row < grid.length &&
            p.col >= 0 && p.col < grid[0].length &&
            grid[p.row][p.col].cellValue === 2
          )

        let owner: TeamName | null = null
        if (GAR_PLANETS.has(index)) owner = 'Grand Army of the Republic'
        else if (CIS_PLANETS.has(index)) owner = 'Confederacy of Independent Systems'

        const name = index < PLANNET_NAMES.length
          ? PLANNET_NAMES[index]
          : `Planet ${index + 1}`

        plannets.push(new Plannet(name, corePos, orbit, owner, { ...DEFAULT_RESOURCES }))
        index++
      }
    }

    return plannets
  }
}
