import type { Position, Grid, Battle, BattleResult, BattleOutcomeType, PlayerBattleCasualty } from '../types/game'
import { Player, Plannet, TeamName } from '../types/game'
import { createGrid, GRID_ROWS, GRID_COLS } from '../utils/grid'
import { isValidMove } from '../utils/validate-move'
import { CELL_MAP } from '../utils/access-map'
import { findNearestCell3 } from '../utils/pathfinding'
import { posLabel } from '../utils/labels'
import { detectBattles, autoClaimUnowned, rollDice } from '../utils/battle'

export type TeamResources = Record<string, Record<string, number>>

export type MoveResult = { ok: true; state: GameState } | { ok: false; reason: string }

const RESOURCE_KEYS = ['Money', 'RawMaterials', 'Fuel', 'ForceSensitivity']

const startingResources = (): Record<string, number> => ({
  Money: 50,
  RawMaterials: 50,
  Fuel: 45,
  ForceSensitivity: 0,
})

const cloneTeamResources = (tr: TeamResources): TeamResources => {
  const result: TeamResources = {}
  for (const team of Object.keys(tr)) {
    result[team] = { ...tr[team] }
  }
  return result
}

const accumulateResources = (teamResources: TeamResources, plannets: Plannet[]): void => {
  for (const planet of plannets) {
    if (!planet.currentOwner) continue
    const totals = teamResources[planet.currentOwner]
    if (!totals) continue
    for (const key of RESOURCE_KEYS) {
      totals[key] += planet.resourceStats[key] ?? 0
    }
  }
}

const clonePlannets = (plannets: Plannet[]): Plannet[] =>
  plannets.map(pl =>
    new Plannet(pl.name, pl.cellLocation, pl.cellsInOrbit, pl.currentOwner, pl.resourceStats)
  )

const clonePlayers = (players: Player[]): Player[] =>
  players.map(p => {
    const np = new Player(p.id, p.name, p.team, p.position)
    np.infantry = p.infantry
    np.experience = p.experience
    return np
  })

const computeCasualties = (
  players: Player[],
  winnerPlayerIds: number[],
  loserPlayerIds: number[],
  margin: number,
): PlayerBattleCasualty[] => {
  const casualties: PlayerBattleCasualty[] = []

  // Winners
  let winOutcome: BattleOutcomeType
  let winReduction: number
  if (margin > 10) {
    winOutcome = 'Low Cost Win'
    winReduction = 0
  } else if (margin >= 5) {
    winOutcome = 'Medium Cost Win'
    winReduction = 0.25
  } else {
    winOutcome = 'High Cost Win'
    winReduction = 0.50
  }

  for (const id of winnerPlayerIds) {
    const p = players.find(pl => pl.id === id)
    if (!p) continue
    const before = p.infantry
    const after = Math.round(before * (1 - winReduction))
    casualties.push({
      playerId: id,
      playerName: p.name,
      outcome: winOutcome,
      infantryBefore: before,
      infantryAfter: after,
      removed: false,
    })
  }

  // Losers
  let loseOutcome: BattleOutcomeType
  let loseReduction: number
  let removed = false
  if (margin > 10) {
    loseOutcome = 'Major Defeat'
    loseReduction = 1
    removed = true
  } else if (margin >= 6) {
    loseOutcome = 'Modest Defeat'
    loseReduction = 0.66
  } else {
    loseOutcome = 'Mild Defeat'
    loseReduction = 0.33
  }

  for (const id of loserPlayerIds) {
    const p = players.find(pl => pl.id === id)
    if (!p) continue
    const before = p.infantry
    const after = removed ? 0 : Math.round(before * (1 - loseReduction))
    casualties.push({
      playerId: id,
      playerName: p.name,
      outcome: loseOutcome,
      infantryBefore: before,
      infantryAfter: after,
      removed,
    })
  }

  return casualties
}

const applyCasualties = (players: Player[], casualties: PlayerBattleCasualty[]): Player[] => {
  const removedIds = new Set(casualties.filter(c => c.removed).map(c => c.playerId))
  const involvedIds = new Set(casualties.map(c => c.playerId))
  const updated = players
    .filter(p => !removedIds.has(p.id))
    .map(p => {
      const np = new Player(p.id, p.name, p.team, p.position)
      np.experience = p.experience
      const casualty = casualties.find(c => c.playerId === p.id)
      np.infantry = casualty ? casualty.infantryAfter : p.infantry
      // +10 experience for battle participants
      if (involvedIds.has(p.id)) np.experience += 10
      return np
    })
  return updated
}

const RECRUIT_COST: Record<string, { Money: number; RawMaterials: number }> = {
  'Grand Army of the Republic': { Money: 150, RawMaterials: 75 },
  'Confederacy of Independent Systems': { Money: 75, RawMaterials: 150 },
}

const TEAM_UNIT_PREFIX: Record<string, string> = {
  'Grand Army of the Republic': 'Clone Trooper',
  'Confederacy of Independent Systems': 'Battle Droid',
}

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
  readonly status: 'playing' | 'battling' | 'error'
  readonly lastMessage: string
  readonly teamResources: TeamResources
  readonly pendingBattles: Battle[]
  readonly lastBattleResult: BattleResult | null

  constructor(
    grid: Grid,
    players: Player[],
    plannets: Plannet[],
    activePlayerIndex: number,
    turn: number,
    status: 'playing' | 'battling' | 'error',
    lastMessage: string,
    teamResources: TeamResources,
    pendingBattles: Battle[] = [],
    lastBattleResult: BattleResult | null = null,
  ) {
    this.grid = grid
    this.players = players
    this.plannets = plannets
    this.activePlayerIndex = activePlayerIndex
    this.turn = turn
    this.status = status
    this.lastMessage = lastMessage
    this.teamResources = teamResources
    this.pendingBattles = pendingBattles
    this.lastBattleResult = lastBattleResult
  }

  get activePlayer(): Player {
    return this.players[this.activePlayerIndex]
  }

  get teamFuel(): number {
    return this.teamResources[this.activePlayer.team]?.Fuel ?? 0
  }

  get currentBattle(): Battle | null {
    return this.pendingBattles[0] ?? null
  }

  get canRecruit(): boolean {
    const team = this.activePlayer.team
    const cost = RECRUIT_COST[team]
    const res = this.teamResources[team]
    if (!cost || !res) return false
    return res.Money >= cost.Money && res.RawMaterials >= cost.RawMaterials
  }

  /** Create a new player for the active team at the given position. */
  recruitPlayer(position: Position): MoveResult {
    const team = this.activePlayer.team
    const cost = RECRUIT_COST[team]
    const res = this.teamResources[team]

    if (!cost || !res || res.Money < cost.Money || res.RawMaterials < cost.RawMaterials) {
      return { ok: false, reason: 'Not enough resources to recruit a new unit' }
    }

    // Must be an accessible cell
    const cell = this.grid[position.row]?.[position.col]
    if (!cell?.accessible) {
      return { ok: false, reason: 'That cell is not accessible' }
    }

    // Must be in orbit of a planet owned by the team
    const inFriendlyOrbit = this.plannets.some(
      p => p.currentOwner === team &&
        p.cellsInOrbit.some(o => o.row === position.row && o.col === position.col)
    )
    if (!inFriendlyOrbit) {
      return { ok: false, reason: 'New unit must be placed in orbit of a planet you control' }
    }

    const nextId = Math.max(...this.players.map(p => p.id)) + 1
    const prefix = TEAM_UNIT_PREFIX[team] ?? 'Unit'
    const teamCount = this.players.filter(p => p.team === team).length + 1
    const name = `${prefix} ${teamCount}`

    const newPlayer = new Player(nextId, name, team, position)
    const newPlayers = [...clonePlayers(this.players), newPlayer]

    const newTeamResources = cloneTeamResources(this.teamResources)
    newTeamResources[team].Money -= cost.Money
    newTeamResources[team].RawMaterials -= cost.RawMaterials

    const msg = `${name} recruited at ${posLabel(position)}`
    return {
      ok: true,
      state: new GameState(this.grid, newPlayers, this.plannets, this.activePlayerIndex, this.turn, 'playing', msg, newTeamResources),
    }
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

    const teamResources: TeamResources = {
      'Grand Army of the Republic': startingResources(),
      'Confederacy of Independent Systems': startingResources(),
    }

    const msg = GameState.buildMessage(grid, players[0], 1, plannets)
    return new GameState(grid, players, plannets, 0, 1, 'playing', msg, teamResources)
  }

  /** Move the active player one cell. Does NOT advance to next player. Consumes 1 fuel. */
  applyMove(targetPos: Position): MoveResult {
    const active = this.activePlayer

    const fuel = this.teamResources[active.team]?.Fuel ?? 0
    if (fuel <= 0) {
      return { ok: false, reason: 'No fuel remaining — end your move' }
    }

    if (!isValidMove(active.position, targetPos)) {
      return { ok: false, reason: 'Invalid move — you can only step to an adjacent cell' }
    }

    const targetCell = this.grid[targetPos.row]?.[targetPos.col]
    if (!targetCell?.accessible) {
      return { ok: false, reason: 'That cell is blocked — you cannot move there' }
    }

    const enemyOnCell = this.players.some(
      p => p.team !== active.team && p.isAt(targetPos)
    )
    if (enemyOnCell) {
      return { ok: false, reason: 'That cell is occupied by the enemy — you cannot move there' }
    }

    const newGrid = this.grid.map(row => row.map(cell => ({ ...cell })))
    const newPlayers = clonePlayers(this.players)
    newPlayers[this.activePlayerIndex].moveTo(targetPos)
    const newPlannets = clonePlannets(this.plannets)

    // No auto-ownership change — ownership only changes via battles

    const newTeamResources = cloneTeamResources(this.teamResources)
    newTeamResources[active.team].Fuel -= 1

    const msg = GameState.buildMessage(newGrid, newPlayers[this.activePlayerIndex], this.turn, newPlannets)

    return {
      ok: true,
      state: new GameState(newGrid, newPlayers, newPlannets, this.activePlayerIndex, this.turn, 'playing', msg, newTeamResources),
    }
  }

  /** End the current player's move and advance to the next player. */
  endPlayerTurn(): GameState {
    const nextPlayerIndex = (this.activePlayerIndex + 1) % this.players.length
    const turnComplete = nextPlayerIndex === 0

    const newTeamResources = cloneTeamResources(this.teamResources)
    const newPlannets = clonePlannets(this.plannets)
    const newPlayers = clonePlayers(this.players)

    if (turnComplete) {
      // All players gain +1 experience at end of turn
      // Players in friendly orbit gain +1 infantry
      for (const p of newPlayers) {
        p.experience += 1
        const inFriendlyOrbit = newPlannets.some(
          pl => pl.currentOwner === p.team &&
            pl.cellsInOrbit.some(o => o.row === p.position.row && o.col === p.position.col)
        )
        if (inFriendlyOrbit) p.infantry += 1
      }

      accumulateResources(newTeamResources, newPlannets)

      // Auto-claim unowned planets with only one team in orbit
      autoClaimUnowned(newPlayers, newPlannets)

      // Detect battles for contested planets
      const battles = detectBattles(newPlayers, newPlannets)
      if (battles.length > 0) {
        const nextTurn = this.turn + 1
        const msg = `Turn ${nextTurn} — ${battles.length} battle(s) to resolve!`
        return new GameState(this.grid, newPlayers, newPlannets, nextPlayerIndex, nextTurn, 'battling', msg, newTeamResources, battles)
      }
    }

    const nextTurn = turnComplete ? this.turn + 1 : this.turn
    const msg = GameState.buildMessage(this.grid, newPlayers[nextPlayerIndex], nextTurn, newPlannets)

    return new GameState(this.grid, newPlayers, newPlannets, nextPlayerIndex, nextTurn, 'playing', msg, newTeamResources)
  }

  /** Record a dice roll for the given team in the current battle. */
  applyBattleRoll(team: TeamName): GameState {
    const battle = this.currentBattle
    if (!battle) return this

    const isAttacker = team === battle.attackingTeam
    const isDefender = team === battle.defendingTeam
    if (!isAttacker && !isDefender) return this

    // Don't re-roll if already rolled
    if (isAttacker && battle.attackerRoll !== null) return this
    if (isDefender && battle.defenderRoll !== null) return this

    const sides = isAttacker ? battle.attackerDiceSides : battle.defenderDiceSides
    const roll = rollDice(sides)

    const updatedBattle: Battle = {
      ...battle,
      attackerRoll: isAttacker ? roll : battle.attackerRoll,
      defenderRoll: isDefender ? roll : battle.defenderRoll,
    }

    // If both have rolled, resolve
    if (updatedBattle.attackerRoll !== null && updatedBattle.defenderRoll !== null) {
      if (updatedBattle.attackerRoll === updatedBattle.defenderRoll) {
        // Tie — reset rolls for re-roll, keep battle in queue
        const tiedBattle: Battle = { ...updatedBattle, attackerRoll: null, defenderRoll: null }
        const newBattles = [tiedBattle, ...this.pendingBattles.slice(1)]
        return new GameState(this.grid, this.players, this.plannets, this.activePlayerIndex, this.turn, 'battling', `Tie on ${battle.planetName}! Roll again.`, this.teamResources, newBattles)
      }

      // Determine winner
      const attackerWins = updatedBattle.attackerRoll > updatedBattle.defenderRoll
      const winner = attackerWins ? battle.attackingTeam : (battle.defendingTeam ?? battle.attackingTeam)
      const margin = Math.abs(updatedBattle.attackerRoll - updatedBattle.defenderRoll)

      const winnerIds = attackerWins ? battle.attackerPlayerIds : battle.defenderPlayerIds
      const loserIds = attackerWins ? battle.defenderPlayerIds : battle.attackerPlayerIds
      const casualties = computeCasualties(this.players, winnerIds, loserIds, margin)

      const newPlayers = applyCasualties(this.players, casualties)
      const newPlannets = clonePlannets(this.plannets)
      newPlannets[battle.planetIndex].currentOwner = winner

      const remainingBattles = this.pendingBattles.slice(1)
      const resolvedResult: BattleResult = { battle: updatedBattle, winner, margin, casualties }

      // Stay in 'battling' so UI can show the result screen
      return new GameState(this.grid, newPlayers, newPlannets, this.activePlayerIndex, this.turn, 'battling', `Battle resolved!`, this.teamResources, remainingBattles, resolvedResult)
    }

    // Only one team has rolled so far
    const newBattles = [updatedBattle, ...this.pendingBattles.slice(1)]
    const rolledLabel = isAttacker ? battle.attackingTeam : battle.defendingTeam
    const msg = `${rolledLabel} rolled ${roll}! Waiting for opponent...`

    return new GameState(this.grid, this.players, this.plannets, this.activePlayerIndex, this.turn, 'battling', msg, this.teamResources, newBattles)
  }

  /** Dismiss the battle result screen and proceed to the next battle or resume play. */
  dismissBattleResult(): GameState {
    if (!this.lastBattleResult) return this

    const newStatus = this.pendingBattles.length > 0 ? 'battling' as const : 'playing' as const
    let msg: string
    if (this.pendingBattles.length > 0) {
      msg = `${this.pendingBattles.length} battle(s) remaining.`
    } else {
      msg = GameState.buildMessage(this.grid, this.players[this.activePlayerIndex], this.turn, this.plannets)
    }

    return new GameState(this.grid, this.players, this.plannets, this.activePlayerIndex, this.turn, newStatus, msg, this.teamResources, this.pendingBattles, null)
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
