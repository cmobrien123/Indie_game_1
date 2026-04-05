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
    RESOURCE_KEYS = ['Money', 'RawMaterials', 'Fuel', 'ForceSensitivity']

    def __init__(
        self,
        grid: list[list[dict]],
        players: list[Player],
        plannets: list[Plannet],
        active_player_index: int,
        turn: int,
        status: str,
        last_message: str,
        team_resources: Optional[dict[str, dict[str, int]]] = None,
    ) -> None:
        self.grid = grid
        self.players = players
        self.plannets = plannets
        self.active_player_index = active_player_index
        self.turn = turn
        self.status = status
        self.last_message = last_message
        self.team_resources = team_resources or {
            'Grand Army of the Republic': {'Money': 50, 'RawMaterials': 50, 'Fuel': 45, 'ForceSensitivity': 0},
            'Confederacy of Independent Systems': {'Money': 50, 'RawMaterials': 50, 'Fuel': 45, 'ForceSensitivity': 0},
        }

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

        # Ensure each player starts in orbit of a planet owned by their team
        used_cells: set[tuple[int, int]] = set()
        for player in players:
            in_friendly_orbit = any(
                p.current_owner == player.team
                and any(o.row == player.position.row and o.col == player.position.col
                        for o in p.cells_in_orbit)
                for p in plannets
            )
            if not in_friendly_orbit:
                friendly_planets = [p for p in plannets if p.current_owner == player.team]
                placed = False
                for planet in friendly_planets:
                    for orbit in planet.cells_in_orbit:
                        key = (orbit.row, orbit.col)
                        if key not in used_cells:
                            player.move_to(orbit)
                            used_cells.add(key)
                            placed = True
                            break
                    if placed:
                        break
            else:
                used_cells.add((player.position.row, player.position.col))

        msg = GameState._build_message(grid, players[0], 1, plannets)
        return GameState(grid, players, plannets, 0, 1, 'playing', msg)

    @property
    def team_fuel(self) -> int:
        return self.team_resources.get(self.active_player.team, {}).get('Fuel', 0)

    def apply_move(self, target_pos: Position) -> MoveResult:
        """Move the active player one cell. Does NOT advance to next player. Consumes 1 fuel."""
        active = self.active_player

        fuel = self.team_resources.get(active.team, {}).get('Fuel', 0)
        if fuel <= 0:
            return MoveResult.failure('No fuel remaining — end your move')

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
            np.infantry = p.infantry
            if i == self.active_player_index:
                np.move_to(target_pos)
            new_players.append(np)

        # Clone plannets
        new_plannets = [
            Plannet(pl.name, pl.cell_location, pl.cells_in_orbit, pl.current_owner, pl.resource_stats)
            for pl in self.plannets
        ]

        # Update planet ownership if the moved unit landed in an orbit cell
        for planet in new_plannets:
            in_orbit = any(
                o.row == target_pos.row and o.col == target_pos.col
                for o in planet.cells_in_orbit
            )
            if in_orbit and planet.current_owner != active.team:
                planet.current_owner = active.team

        # Consume 1 fuel
        new_team_resources = {
            team: dict(resources)
            for team, resources in self.team_resources.items()
        }
        new_team_resources[active.team]['Fuel'] -= 1

        msg = GameState._build_message(new_grid, new_players[self.active_player_index], self.turn, new_plannets)

        return MoveResult.success(
            GameState(new_grid, new_players, new_plannets, self.active_player_index, self.turn, 'playing', msg, new_team_resources)
        )

    def end_player_turn(self) -> 'GameState':
        """End the current player's move and advance to the next player."""
        next_player_index = (self.active_player_index + 1) % len(self.players)
        turn_complete = next_player_index == 0

        new_team_resources = {
            team: dict(resources)
            for team, resources in self.team_resources.items()
        }
        if turn_complete:
            for planet in self.plannets:
                if planet.current_owner and planet.current_owner in new_team_resources:
                    for key in self.RESOURCE_KEYS:
                        new_team_resources[planet.current_owner][key] += planet.resource_stats.get(key, 0)

        next_turn = self.turn + 1 if turn_complete else self.turn
        msg = GameState._build_message(self.grid, self.players[next_player_index], next_turn, self.plannets)

        return GameState(self.grid, self.players, self.plannets, next_player_index, next_turn, 'playing', msg, new_team_resources)

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
