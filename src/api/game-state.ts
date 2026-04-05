import type { Position, Grid } from '../types/game'
import { Player, Plannet, TeamName } from '../types/game'
import { createGrid, GRID_ROWS, GRID_COLS } from '../utils/grid'
import { isValidMove } from '../utils/validate-move'
import { CELL_MAP } from '../utils/access-map'
import { findNearestCell3 } from '../utils/pathfinding'
import { posLabel } from '../utils/labels'

export type MoveResult = { ok: true; state: GameState } | { ok: false; reason: string }

const STARTING_PLAYERS: { name: string; team: TeamName; position: Position }[] = [
  { name: 'Clone Trooper 1', team: 'Grand Army of the Republic', position: { row: 31, col: 11 } },
  { name: 'Clone Trooper 2', team: 'Grand Army of the Republic', position: { row: 40, col: 18 } },
  { name: 'Clone Trooper 3', team: 'Grand Army of the Republic', position: { row: 29, col: 18 } },
  { name: 'Battle Droid 1', team: 'Confederacy of Independent Systems', position: { row: 78, col: 28 } },
  { name: 'Battle Droid 2', team: 'Confederacy of Independent Systems', position: { row: 2, col: 23 } },
  { name: 'Battle Droid 3', team: 'Confederacy of Independent Systems', position: { row: 11, col: 27 } },
]

export class GameState {
  readonly grid: Grid
  readonly players: Player[]
  readonly plannets: Plannet[]
  readonly activePlayerIndex: number
  readonly turn: number
  readonly status: 'playing' | 'error'
  readonly lastMessage: string

  constructor(
    grid: Grid,
    players: Player[],
    plannets: Plannet[],
    activePlayerIndex: number,
    turn: number,
    status: 'playing' | 'error',
    lastMessage: string,
  ) {
    this.grid = grid
    this.players = players
    this.plannets = plannets
    this.activePlayerIndex = activePlayerIndex
    this.turn = turn
    this.status = status
    this.lastMessage = lastMessage
  }

  get activePlayer(): Player {
    return this.players[this.activePlayerIndex]
  }

  static create(): GameState {
    const grid = createGrid(GRID_ROWS, GRID_COLS, CELL_MAP)

    const players = STARTING_PLAYERS.map((sp, id) =>
      new Player(id, sp.name, sp.team, sp.position)
    )

    const plannets = Plannet.discoverAll(grid)

    // Ensure each player starts in orbit of a planet owned by their team
    const usedCells = new Set<string>()
    for (const player of players) {
      const inFriendlyOrbit = plannets.some(
        p => p.currentOwner === player.team &&
          p.cellsInOrbit.some(o => o.row === player.position.row && o.col === player.position.col)
      )
      if (!inFriendlyOrbit) {
        const friendlyPlanets = plannets.filter(p => p.currentOwner === player.team)
        let placed = false
        for (const planet of friendlyPlanets) {
          for (const orbit of planet.cellsInOrbit) {
            const key = `${orbit.row},${orbit.col}`
            if (!usedCells.has(key)) {
              player.moveTo(orbit)
              usedCells.add(key)
              placed = true
              break
            }
          }
          if (placed) break
        }
      } else {
        usedCells.add(`${player.position.row},${player.position.col}`)
      }
    }

    const msg = GameState.buildMessage(grid, players[0], 1, plannets)
    return new GameState(grid, players, plannets, 0, 1, 'playing', msg)
  }

  applyMove(targetPos: Position): MoveResult {
    const active = this.activePlayer

    if (!isValidMove(active.position, targetPos)) {
      return {
        ok: false,
        reason: 'Invalid move — you can only step to an adjacent cell',
      }
    }

    const targetCell = this.grid[targetPos.row]?.[targetPos.col]
    if (!targetCell?.accessible) {
      return {
        ok: false,
        reason: 'That cell is blocked — you cannot move there',
      }
    }

    const enemyOnCell = this.players.some(
      p => p.team !== active.team && p.isAt(targetPos)
    )
    if (enemyOnCell) {
      return {
        ok: false,
        reason: 'That cell is occupied by the enemy — you cannot move there',
      }
    }

    const newGrid = this.grid.map(row => row.map(cell => ({ ...cell })))
    const newPlayers = this.players.map((p, i) => {
      const np = new Player(p.id, p.name, p.team, p.position)
      if (i === this.activePlayerIndex) np.moveTo(targetPos)
      return np
    })
    const newPlannets = this.plannets.map(pl =>
      new Plannet(pl.name, pl.cellLocation, pl.cellsInOrbit, pl.currentOwner, pl.resourceStats)
    )

    // Update planet ownership if the moved unit landed in an orbit cell
    for (const planet of newPlannets) {
      const inOrbit = planet.cellsInOrbit.some(
        o => o.row === targetPos.row && o.col === targetPos.col
      )
      if (inOrbit && planet.currentOwner !== active.team) {
        planet.currentOwner = active.team
      }
    }

    const nextPlayerIndex = (this.activePlayerIndex + 1) % this.players.length
    const nextTurn = this.turn + 1
    const msg = GameState.buildMessage(newGrid, newPlayers[nextPlayerIndex], nextTurn, newPlannets)

    return {
      ok: true,
      state: new GameState(newGrid, newPlayers, newPlannets, nextPlayerIndex, nextTurn, 'playing', msg),
    }
  }

  private static buildMessage(grid: Grid, player: Player, turn: number, plannets: Plannet[]): string {
    const cell = grid[player.position.row][player.position.col]
    const prefix = `Turn ${turn} — ${player.name} (${player.team})`
    if (cell.cellValue === 2) {
      const nearest = findNearestCell3(grid, player.position)
      if (nearest) {
        const planet = plannets.find(
          p => p.cellLocation.row === nearest.row && p.cellLocation.col === nearest.col
        )
        const label = planet ? planet.name : posLabel(nearest)
        return `${prefix} — Nearest planet: ${label}`
      }
    }
    return `${prefix} — click an adjacent cell to move`
  }
}
