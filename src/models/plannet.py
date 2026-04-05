from __future__ import annotations
from typing import Optional

from .player import Position, TeamName


DEFAULT_RESOURCES: dict[str, int] = {
    'credits': 100,
    'fuel': 50,
    'minerals': 30,
}


def _get_hex_neighbor_offsets(row: int) -> list[Position]:
    """Return the 6 hex neighbor offsets for odd-r offset grid."""
    if row % 2 == 0:
        return [
            Position(0, 1),   # E
            Position(0, -1),  # W
            Position(-1, 0),  # NE
            Position(-1, -1), # NW
            Position(1, 0),   # SE
            Position(1, -1),  # SW
        ]
    return [
        Position(0, 1),   # E
        Position(0, -1),  # W
        Position(-1, 1),  # NE
        Position(-1, 0),  # NW
        Position(1, 1),   # SE
        Position(1, 0),   # SW
    ]


def _compute_orbit(grid: list[list[dict]], row: int, col: int) -> list[Position]:
    """Find cellValue-2 hex neighbors around a core cell."""
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    orbit: list[Position] = []
    for off in _get_hex_neighbor_offsets(row):
        nr, nc = row + off.row, col + off.col
        if 0 <= nr < rows and 0 <= nc < cols:
            if grid[nr][nc]['cellValue'] == 2:
                orbit.append(Position(nr, nc))
    return orbit


class Plannet:
    """Base class for all planets."""

    NAME: str = ''
    CORE_ROW: int = 0
    CORE_COL: int = 0
    DEFAULT_OWNER: Optional[TeamName] = None

    def __init__(
        self,
        name: str,
        cell_location: Position,
        cells_in_orbit: list[Position],
        current_owner: Optional[TeamName],
        resource_stats: dict[str, int],
    ) -> None:
        self.name = name
        self.cell_location = Position(cell_location.row, cell_location.col)
        self.cells_in_orbit = [Position(p.row, p.col) for p in cells_in_orbit]
        self.current_owner = current_owner
        self.resource_stats = dict(resource_stats)

    @classmethod
    def from_grid(cls, grid: list[list[dict]]) -> Plannet:
        """Create this planet from the grid, auto-detecting orbit cells."""
        orbit = _compute_orbit(grid, cls.CORE_ROW, cls.CORE_COL)
        return cls(
            cls.NAME,
            Position(cls.CORE_ROW, cls.CORE_COL),
            orbit,
            cls.DEFAULT_OWNER,
            dict(DEFAULT_RESOURCES),
        )

    @staticmethod
    def discover_all(grid: list[list[dict]]) -> list[Plannet]:
        """Create all planet instances from the grid.

        Returns:
            List of Plannet subclass instances in discovery order.
        """
        return [cls.from_grid(grid) for cls in ALL_PLANNETS]

    def __repr__(self) -> str:
        return (
            f'{type(self).__name__}(name={self.name!r}, cell_location={self.cell_location}, '
            f'orbit_count={len(self.cells_in_orbit)}, owner={self.current_owner!r})'
        )


# ---------------------------------------------------------------------------
# 38 planet subclasses — one per grid core, in discovery order (top-left to
# bottom-right scan).  Each bakes in its name, grid position, and starting
# owner so the data is declarative and easy to override per-planet.
# ---------------------------------------------------------------------------

class Kenari(Plannet):
    NAME = 'Kenari'
    CORE_ROW = 1
    CORE_COL = 23
    DEFAULT_OWNER = 'Confederacy of Independent Systems'


class Serenno(Plannet):
    NAME = 'Serenno'
    CORE_ROW = 6
    CORE_COL = 18


class AjanKloss(Plannet):
    NAME = 'AjanKloss'
    CORE_ROW = 7
    CORE_COL = 13


class Yavin4(Plannet):
    NAME = 'Yavin4'
    CORE_ROW = 9
    CORE_COL = 21
    DEFAULT_OWNER = 'Confederacy of Independent Systems'


class Felucia(Plannet):
    NAME = 'Felucia'
    CORE_ROW = 10
    CORE_COL = 25
    DEFAULT_OWNER = 'Confederacy of Independent Systems'


class Mandalore(Plannet):
    NAME = 'Mandalore'
    CORE_ROW = 13
    CORE_COL = 18


class LolaSayu(Plannet):
    NAME = 'LolaSayu'
    CORE_ROW = 14
    CORE_COL = 27


class Csilla(Plannet):
    NAME = 'Csilla'
    CORE_ROW = 19
    CORE_COL = 1


class Kijimi(Plannet):
    NAME = 'Kijimi'
    CORE_ROW = 20
    CORE_COL = 24


class Bracca(Plannet):
    NAME = 'Bracca'
    CORE_ROW = 23
    CORE_COL = 20


class CarrickStation(Plannet):
    NAME = 'CarrickStation'
    CORE_ROW = 24
    CORE_COL = 13


class Kashyyk(Plannet):
    NAME = 'Kashyyk'
    CORE_ROW = 28
    CORE_COL = 20


class Coruscant(Plannet):
    NAME = 'Coruscant'
    CORE_ROW = 29
    CORE_COL = 10
    DEFAULT_OWNER = 'Grand Army of the Republic'


class Onderon(Plannet):
    NAME = 'Onderon'
    CORE_ROW = 30
    CORE_COL = 15
    DEFAULT_OWNER = 'Grand Army of the Republic'


class Plannet_15(Plannet):
    NAME = 'Plannet_15'
    CORE_ROW = 31
    CORE_COL = 30


class Kessel(Plannet):
    NAME = 'Plannet_16'
    CORE_ROW = 34
    CORE_COL = 39


class Alderaan(Plannet):
    NAME = 'Alderaan'
    CORE_ROW = 36
    CORE_COL = 12
    DEFAULT_OWNER = 'Grand Army of the Republic'


class Plannet_18(Plannet):
    NAME = 'Plannet_18'
    CORE_ROW = 41
    CORE_COL = 17
    DEFAULT_OWNER = 'Grand Army of the Republic'


class Corellia(Plannet):
    NAME = 'Plannet_19'
    CORE_ROW = 42
    CORE_COL = 13
    DEFAULT_OWNER = 'Grand Army of the Republic'


class Plannet_20(Plannet):
    NAME = 'Plannet_20'
    CORE_ROW = 43
    CORE_COL = 35


class HrakertStation(Plannet):
    NAME = 'HrakertStation'
    CORE_ROW = 47
    CORE_COL = 17


class Plannet_22(Plannet):
    NAME = 'Plannet_22'
    CORE_ROW = 51
    CORE_COL = 22


class Scarif(Plannet):
    NAME = 'Plannet_23'
    CORE_ROW = 64
    CORE_COL = 38


class Jakku(Plannet):
    NAME = 'Jakku'
    CORE_ROW = 66
    CORE_COL = 9


class Takodana(Plannet):
    NAME = 'Takodana'
    CORE_ROW = 66
    CORE_COL = 13


class Fondor(Plannet):
    NAME = 'Fondor'
    CORE_ROW = 66
    CORE_COL = 17


class RichiSation(Plannet):
    NAME = 'RichiSation'
    CORE_ROW = 71
    CORE_COL = 35


class Kammino(Plannet):
    NAME = 'Kammino'
    CORE_ROW = 71
    CORE_COL = 39


class Kafrene(Plannet):
    NAME = 'Kafrene'
    CORE_ROW = 73
    CORE_COL = 1


class Endor(Plannet):
    NAME = 'Endor'
    CORE_ROW = 76
    CORE_COL = 8


class Tatooine(Plannet):
    NAME = 'Tatooine'
    CORE_ROW = 76
    CORE_COL = 35


class Naboo(Plannet):
    NAME = 'Naboo'
    CORE_ROW = 77
    CORE_COL = 28
    DEFAULT_OWNER = 'Confederacy of Independent Systems'


class Geonosis(Plannet):
    NAME = 'Geonosis'
    CORE_ROW = 77
    CORE_COL = 39


class Bespin(Plannet):
    NAME = 'Bespin'
    CORE_ROW = 81
    CORE_COL = 20


class DQar(Plannet):
    NAME = 'DQar'
    CORE_ROW = 81
    CORE_COL = 26
    DEFAULT_OWNER = 'Confederacy of Independent Systems'


class Ferrix(Plannet):
    NAME = 'Ferrix'
    CORE_ROW = 85
    CORE_COL = 16


class Hoth(Plannet):
    NAME = 'Hoth'
    CORE_ROW = 85
    CORE_COL = 20


class Mustafar(Plannet):
    NAME = 'Mustafar'
    CORE_ROW = 90
    CORE_COL = 23


# Registry of all planet classes in discovery order
ALL_PLANNETS: list[type[Plannet]] = [
    Kenari, Serenno, AjanKloss, Yavin4, Felucia,
    Mandalore, LolaSayu, Csilla, Kijimi, Bracca,
    CarrickStation, Kashyyk, Coruscant, Onderon, Plannet_15,
    Kessel, Alderaan, Plannet_18, Corellia, Plannet_20,
    HrakertStation, Plannet_22, Scarif, Jakku, Takodana,
    Fondor, RichiSation, Kammino, Kafrene, Endor,
    Tatooine, Naboo, Geonosis, Bespin, DQar,
    Ferrix, Hoth, Mustafar,
]
