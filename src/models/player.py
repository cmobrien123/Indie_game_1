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


class Player:
    def __init__(self, id: int, name: str, team: TeamName, position: Position) -> None:
        self.id = id
        self.name = name
        self.team = team
        self.position = Position(position.row, position.col)

    def move_to(self, target: Position) -> None:
        self.position = Position(target.row, target.col)

    def is_enemy_of(self, other: Player) -> bool:
        return self.team != other.team

    def is_at(self, pos: Position) -> bool:
        return self.position.row == pos.row and self.position.col == pos.col

    def __repr__(self) -> str:
        return f'Player(id={self.id}, name={self.name!r}, team={self.team!r}, position={self.position})'
