import { getHexNeighborOffsets } from '../utils/grid-helpers'

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

export class Player {
  readonly id: number
  readonly name: string
  readonly team: TeamName
  position: Position

  constructor(id: number, name: string, team: TeamName, position: Position) {
    this.id = id
    this.name = name
    this.team = team
    this.position = { ...position }
  }

  moveTo(target: Position): void {
    this.position = { ...target }
  }

  isEnemyOf(other: Player): boolean {
    return this.team !== other.team
  }

  isAt(pos: Position): boolean {
    return this.position.row === pos.row && this.position.col === pos.col
  }
}

const PLANNET_NAMES = [
  'Kenari', 'Serenno', 'AjanKloss', 'Yavin4', 'Felucia',
  'Mandalore', 'LolaSayu', 'Csilla', 'Kijimi', 'Bracca',
  'CarrickStation', 'Kashyyk', 'Coruscant', 'Onderon', 'Plannet_15',
  'Plannet_16', 'Alderaan', 'Plannet_18', 'Plannet_19', 'Plannet_20',
  'HrakertStation', 'Plannet_22', 'Plannet_23', 'Jakku', 'Takodana',
  'Fondor', 'RichiSation', 'Kammino', 'Kafrene', 'Endor',
  'Tatooine', 'Naboo', 'Geonosis', 'Bespin', 'DQar',
  'Ferrix', 'Hoth', 'Mustafar',
]
const GAR_PLANETS = new Set([12, 13, 16, 17, 18])
const CIS_PLANETS = new Set([0, 3, 4, 31, 34])
const DEFAULT_RESOURCES = { credits: 100, fuel: 50, minerals: 30 }

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
          .map((off: Position) => ({ row: row + off.row, col: col + off.col }))
          .filter((p: Position) =>
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
