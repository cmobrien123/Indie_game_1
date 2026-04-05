import type { Position, TeamName } from '../types/game'

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
