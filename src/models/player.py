from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Position:
    row: int
    col: int

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Position):
            return NotImplemented
        return self.row == other.row and self.col == other.col


TeamName = str  # 'Grand Army of the Republic' | 'Confederacy of Independent Systems'


GAR_STARTING_INFANTRY = 12
CIS_STARTING_INFANTRY = 16
MAX_INFANTRY = 30


class Player:
    def __init__(self, id: int, name: str, team: TeamName, position: Position) -> None:
        self.id = id
        self.name = name
        self.team = team
        self.position = Position(position.row, position.col)
        self._infantry = GAR_STARTING_INFANTRY if team == 'Grand Army of the Republic' else CIS_STARTING_INFANTRY
        self.experience = 0

    @property
    def infantry(self) -> int:
        return self._infantry

    @infantry.setter
    def infantry(self, value: int) -> None:
        self._infantry = min(value, MAX_INFANTRY)

    @property
    def experience_level(self) -> str:
        if self.experience >= 150:
            return 'EliteUnit'
        if self.experience >= 25:
            return 'Vet'
        return 'Rookie'

    def move_to(self, target: Position) -> None:
        self.position = Position(target.row, target.col)

    def is_enemy_of(self, other: Player) -> bool:
        return self.team != other.team

    def is_at(self, pos: Position) -> bool:
        return self.position.row == pos.row and self.position.col == pos.col

    def __repr__(self) -> str:
        return f'Player(id={self.id}, name={self.name!r}, team={self.team!r}, position={self.position})'
