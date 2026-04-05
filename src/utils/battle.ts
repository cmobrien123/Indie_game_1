import type { Battle, TeamName } from '../types/game'
import { Player, Plannet } from '../types/game'

const DEFENDER_BONUS = 8

const teamsInOrbit = (
  players: Player[],
  orbit: { row: number; col: number }[],
): Map<TeamName, Player[]> => {
  const result = new Map<TeamName, Player[]>()
  for (const player of players) {
    const inOrbit = orbit.some(
      o => o.row === player.position.row && o.col === player.position.col
    )
    if (inOrbit) {
      const list = result.get(player.team) ?? []
      list.push(player)
      result.set(player.team, list)
    }
  }
  return result
}

const sumInfantry = (players: Player[]): number =>
  players.reduce((sum, p) => sum + p.infantry, 0)

export const detectBattles = (players: Player[], plannets: Plannet[]): Battle[] => {
  const battles: Battle[] = []

  for (let i = 0; i < plannets.length; i++) {
    const planet = plannets[i]
    const teamMap = teamsInOrbit(players, planet.cellsInOrbit)

    if (planet.currentOwner) {
      // Owned planet — battle if enemy team has players in orbit
      const enemyTeam = planet.currentOwner === 'Grand Army of the Republic'
        ? 'Confederacy of Independent Systems'
        : 'Grand Army of the Republic'
      const attackers = teamMap.get(enemyTeam as TeamName)
      if (!attackers || attackers.length === 0) continue

      const defenders = teamMap.get(planet.currentOwner) ?? []
      const attackerInfantry = sumInfantry(attackers)
      const defenderInfantry = sumInfantry(defenders)

      battles.push({
        planetIndex: i,
        planetName: planet.name,
        attackingTeam: enemyTeam as TeamName,
        defendingTeam: planet.currentOwner,
        attackerPlayerIds: attackers.map(p => p.id),
        defenderPlayerIds: defenders.map(p => p.id),
        attackerDiceSides: attackerInfantry,
        defenderDiceSides: defenderInfantry + DEFENDER_BONUS,
        attackerRoll: null,
        defenderRoll: null,
      })
    } else {
      // Unowned planet — battle if BOTH teams have players in orbit
      const teams = [...teamMap.keys()]
      if (teams.length < 2) continue

      const teamA = teams[0]
      const teamB = teams[1]
      const playersA = teamMap.get(teamA)!
      const playersB = teamMap.get(teamB)!

      battles.push({
        planetIndex: i,
        planetName: planet.name,
        attackingTeam: teamA,
        defendingTeam: teamB,
        attackerPlayerIds: playersA.map(p => p.id),
        defenderPlayerIds: playersB.map(p => p.id),
        attackerDiceSides: sumInfantry(playersA),
        defenderDiceSides: sumInfantry(playersB),
        attackerRoll: null,
        defenderRoll: null,
      })
    }
  }

  return battles
}

export const autoClaimUnowned = (players: Player[], plannets: Plannet[]): void => {
  for (const planet of plannets) {
    if (planet.currentOwner) continue
    const teamMap = teamsInOrbit(players, planet.cellsInOrbit)
    const teams = [...teamMap.keys()]
    if (teams.length === 1) {
      planet.currentOwner = teams[0]
    }
  }
}

export const rollDice = (sides: number): number => {
  if (sides <= 0) return 0
  return Math.floor(Math.random() * sides) + 1
}
