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

export interface Battle {
  planetIndex: number
  planetName: string
  attackingTeam: TeamName
  defendingTeam: TeamName | null
  attackerPlayerIds: number[]
  defenderPlayerIds: number[]
  attackerDiceSides: number
  defenderDiceSides: number
  attackerRoll: number | null
  defenderRoll: number | null
}

export interface BattleResult {
  battle: Battle
  winner: TeamName
}

export class Player {
  readonly id: number
  readonly name: string
  readonly team: TeamName
  position: Position
  infantry: number

  constructor(id: number, name: string, team: TeamName, position: Position) {
    this.id = id
    this.name = name
    this.team = team
    this.position = { ...position }
    this.infantry = team === 'Grand Army of the Republic' ? 12 : 16
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
  'CarrickStation', 'Kashyyk', 'Coruscant', 'Onderon', 'NalHutta',
  'Kessel', 'Alderaan', 'Plannet_18', 'Plannet_19', 'Bothawui',
  'HrakertStation', 'Fondor', 'Scarif', 'Jakku', 'Takodana',
  'YagDhul', 'RichiSation', 'Kammino', 'Kafrene', 'Endor',
  'Tatooine', 'Naboo', 'Geonosis', 'Bespin', 'DQar',
  'Ferrix', 'Hoth', 'Mustafar',
]
const GAR_PLANETS = new Set([2, 3, 5, 10, 11, 12, 13, 16, 17, 18, 20, 24, 26, 27, 29, 31, 33, 36])
const CIS_PLANETS = new Set([0, 1, 4, 6, 7, 8, 9, 14, 15, 19, 21, 22, 23, 25, 28, 30, 32, 34, 35, 37])
const DEFAULT_RESOURCES = { Money: 0, RawMaterials: 0, Fuel: 0, ForceSensitivity: 0 }
const PLANET_RESOURCES: Record<string, number>[] = [
  { Money: 3, RawMaterials: 5, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 1, Fuel: 0, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 1, Fuel: 0, ForceSensitivity: 0 },
  { Money: 0, RawMaterials: 1, Fuel: 0, ForceSensitivity: 3 },
  { Money: 5, RawMaterials: 5, Fuel: 0, ForceSensitivity: 0 },
  { Money: 15, RawMaterials: 1, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 0, Fuel: 0, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 3, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 3, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 1, Fuel: 3, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 0, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 5, Fuel: 8, ForceSensitivity: 1 },
  { Money: 20, RawMaterials: 8, Fuel: 5, ForceSensitivity: 4 },
  { Money: 5, RawMaterials: 3, Fuel: 0, ForceSensitivity: 0 },
  { Money: 15, RawMaterials: 3, Fuel: 15, ForceSensitivity: 1 },
  { Money: 5, RawMaterials: 10, Fuel: 3, ForceSensitivity: 0 },
  { Money: 15, RawMaterials: 1, Fuel: 0, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 0, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 1, Fuel: 3, ForceSensitivity: 0 },
  { Money: 3, RawMaterials: 3, Fuel: 3, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 0, Fuel: 0, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 5, Fuel: 3, ForceSensitivity: 0 },
  { Money: 3, RawMaterials: 1, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 6, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 5, Fuel: 5, ForceSensitivity: 0 },
  { Money: 3, RawMaterials: 3, Fuel: 3, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 0, Fuel: 0, ForceSensitivity: 0 },
  { Money: 10, RawMaterials: 8, Fuel: 3, ForceSensitivity: 0 },
  { Money: 0, RawMaterials: 1, Fuel: 3, ForceSensitivity: 0 },
  { Money: 0, RawMaterials: 3, Fuel: 0, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 3, Fuel: 3, ForceSensitivity: 1 },
  { Money: 10, RawMaterials: 3, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 10, Fuel: 0, ForceSensitivity: 0 },
  { Money: 5, RawMaterials: 3, Fuel: 3, ForceSensitivity: 0 },
  { Money: 3, RawMaterials: 3, Fuel: 0, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 3, Fuel: 3, ForceSensitivity: 0 },
  { Money: 1, RawMaterials: 3, Fuel: 0, ForceSensitivity: 0 },
  { Money: 0, RawMaterials: 10, Fuel: 3, ForceSensitivity: 0 },
]

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

        const resources = index < PLANET_RESOURCES.length
          ? { ...PLANET_RESOURCES[index] }
          : { ...DEFAULT_RESOURCES }
        plannets.push(new Plannet(name, corePos, orbit, owner, resources))
        index++
      }
    }

    return plannets
  }
}
