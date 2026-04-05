from __future__ import annotations
from typing import Optional, Union

from .player import Player, Position, TeamName
from .plannet import Plannet


STARTING_PLAYERS = [
    {'name': 'Clone Trooper 1', 'team': 'Grand Army of the Republic', 'position': Position(31, 11)},
    {'name': 'Clone Trooper 2', 'team': 'Grand Army of the Republic', 'position': Position(40, 18)},
    {'name': 'Clone Trooper 3', 'team': 'Grand Army of the Republic', 'position': Position(29, 18)},
    {'name': 'Battle Droid 1', 'team': 'Confederacy of Independent Systems', 'position': Position(78, 28)},
    {'name': 'Battle Droid 2', 'team': 'Confederacy of Independent Systems', 'position': Position(2, 23)},
    {'name': 'Battle Droid 3', 'team': 'Confederacy of Independent Systems', 'position': Position(11, 27)},
]


class MoveResult:
    """Result of a move attempt. Check `ok` before accessing `state` or `reason`."""

    def __init__(
        self,
        ok: bool,
        state: Optional[GameState] = None,
        reason: Optional[str] = None,
    ) -> None:
        self.ok = ok
        self.state = state
        self.reason = reason

    @staticmethod
    def success(state: GameState) -> MoveResult:
        return MoveResult(ok=True, state=state)

    @staticmethod
    def failure(reason: str) -> MoveResult:
        return MoveResult(ok=False, reason=reason)


def _is_valid_move(current: Position, target: Position) -> bool:
    """Check whether target is a hex neighbor of current (odd-r offset grid)."""
    from .plannet import _get_hex_neighbor_offsets

    for off in _get_hex_neighbor_offsets(current.row):
        if current.row + off.row == target.row and current.col + off.col == target.col:
            return True
    return False


def _find_nearest_cell3(grid: list[list[dict]], start: Position) -> Optional[Position]:
    """BFS to find the nearest cellValue===3 cell from start."""
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    visited: set[tuple[int, int]] = {(start.row, start.col)}
    queue: list[Position] = [start]

    from .plannet import _get_hex_neighbor_offsets

    while queue:
        current = queue.pop(0)
        for off in _get_hex_neighbor_offsets(current.row):
            nr, nc = current.row + off.row, current.col + off.col
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in visited:
                visited.add((nr, nc))
                if grid[nr][nc]['cellValue'] == 3:
                    return Position(nr, nc)
                queue.append(Position(nr, nc))
    return None


def _col_label(col: int) -> str:
    if col < 26:
        return chr(65 + col)
    return chr(64 + col // 26) + chr(65 + col % 26)


def _pos_label(pos: Position) -> str:
    return f'{_col_label(pos.col)}{pos.row + 1}'


class GameState:
    def __init__(
        self,
        grid: list[list[dict]],
        players: list[Player],
        plannets: list[Plannet],
        active_player_index: int,
        turn: int,
        status: str,
        last_message: str,
    ) -> None:
        self.grid = grid
        self.players = players
        self.plannets = plannets
        self.active_player_index = active_player_index
        self.turn = turn
        self.status = status
        self.last_message = last_message

    @property
    def active_player(self) -> Player:
        return self.players[self.active_player_index]

    @staticmethod
    def create(grid: list[list[dict]]) -> GameState:
        """Create a new game state from a grid.

        Args:
            grid: 2D list of cell dicts with keys 'cellValue', 'accessible',
                  and 'position' (dict with 'row' and 'col').
        """
        players = [
            Player(i, sp['name'], sp['team'], sp['position'])
            for i, sp in enumerate(STARTING_PLAYERS)
        ]

        plannets = Plannet.discover_all(grid)

        msg = GameState._build_message(grid, players[0], 1, plannets)
        return GameState(grid, players, plannets, 0, 1, 'playing', msg)

    def apply_move(self, target_pos: Position) -> MoveResult:
        active = self.active_player

        if not _is_valid_move(active.position, target_pos):
            return MoveResult.failure('Invalid move — you can only step to an adjacent cell')

        target_cell = self.grid[target_pos.row][target_pos.col]
        if not target_cell.get('accessible', False):
            return MoveResult.failure('That cell is blocked — you cannot move there')

        enemy_on_cell = any(
            p.team != active.team and p.is_at(target_pos)
            for p in self.players
        )
        if enemy_on_cell:
            return MoveResult.failure('That cell is occupied by the enemy — you cannot move there')

        # Clone grid
        new_grid = [
            [dict(cell) for cell in row]
            for row in self.grid
        ]

        # Clone players, move the active one
        new_players = []
        for i, p in enumerate(self.players):
            np = Player(p.id, p.name, p.team, p.position)
            if i == self.active_player_index:
                np.move_to(target_pos)
            new_players.append(np)

        # Clone plannets
        new_plannets = [
            Plannet(pl.name, pl.cell_location, pl.cells_in_orbit, pl.current_owner, pl.resource_stats)
            for pl in self.plannets
        ]

        next_player_index = (self.active_player_index + 1) % len(self.players)
        next_turn = self.turn + 1
        msg = GameState._build_message(new_grid, new_players[next_player_index], next_turn, new_plannets)

        return MoveResult.success(
            GameState(new_grid, new_players, new_plannets, next_player_index, next_turn, 'playing', msg)
        )

    @staticmethod
    def _build_message(grid: list[list[dict]], player: Player, turn: int, plannets: list[Plannet]) -> str:
        cell = grid[player.position.row][player.position.col]
        prefix = f'Turn {turn} — {player.name} ({player.team})'
        if cell['cellValue'] == 2:
            nearest = _find_nearest_cell3(grid, player.position)
            if nearest:
                planet = next(
                    (p for p in plannets
                     if p.cell_location.row == nearest.row and p.cell_location.col == nearest.col),
                    None,
                )
                label = planet.name if planet else _pos_label(nearest)
                return f'{prefix} — Nearest planet: {label}'
        return f'{prefix} — click an adjacent cell to move'
