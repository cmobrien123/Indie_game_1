from __future__ import annotations
import random
from typing import Optional

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

DEFENDER_BONUS = 8


class Battle:
    def __init__(
        self,
        planet_index: int,
        planet_name: str,
        attacking_team: TeamName,
        defending_team: Optional[TeamName],
        attacker_player_ids: list[int],
        defender_player_ids: list[int],
        attacker_dice_sides: int,
        defender_dice_sides: int,
        attacker_roll: Optional[int] = None,
        defender_roll: Optional[int] = None,
    ) -> None:
        self.planet_index = planet_index
        self.planet_name = planet_name
        self.attacking_team = attacking_team
        self.defending_team = defending_team
        self.attacker_player_ids = attacker_player_ids
        self.defender_player_ids = defender_player_ids
        self.attacker_dice_sides = attacker_dice_sides
        self.defender_dice_sides = defender_dice_sides
        self.attacker_roll = attacker_roll
        self.defender_roll = defender_roll


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
    from .plannet import _get_hex_neighbor_offsets
    for off in _get_hex_neighbor_offsets(current.row):
        if current.row + off.row == target.row and current.col + off.col == target.col:
            return True
    return False


def _find_nearest_cell3(grid: list[list[dict]], start: Position) -> Optional[Position]:
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


def _roll_dice(sides: int) -> int:
    if sides <= 0:
        return 0
    return random.randint(1, sides)


def _teams_in_orbit(players: list[Player], orbit: list[Position]) -> dict[str, list[Player]]:
    result: dict[str, list[Player]] = {}
    orbit_set = {(o.row, o.col) for o in orbit}
    for p in players:
        if (p.position.row, p.position.col) in orbit_set:
            result.setdefault(p.team, []).append(p)
    return result


def _detect_battles(players: list[Player], plannets: list[Plannet]) -> list[Battle]:
    battles: list[Battle] = []
    for i, planet in enumerate(plannets):
        team_map = _teams_in_orbit(players, planet.cells_in_orbit)
        if planet.current_owner:
            enemy_team = (
                'Confederacy of Independent Systems'
                if planet.current_owner == 'Grand Army of the Republic'
                else 'Grand Army of the Republic'
            )
            attackers = team_map.get(enemy_team, [])
            if not attackers:
                continue
            defenders = team_map.get(planet.current_owner, [])
            battles.append(Battle(
                planet_index=i,
                planet_name=planet.name,
                attacking_team=enemy_team,
                defending_team=planet.current_owner,
                attacker_player_ids=[p.id for p in attackers],
                defender_player_ids=[p.id for p in defenders],
                attacker_dice_sides=sum(p.infantry for p in attackers),
                defender_dice_sides=sum(p.infantry for p in defenders) + DEFENDER_BONUS,
            ))
        else:
            teams = list(team_map.keys())
            if len(teams) < 2:
                continue
            team_a, team_b = teams[0], teams[1]
            players_a = team_map[team_a]
            players_b = team_map[team_b]
            battles.append(Battle(
                planet_index=i,
                planet_name=planet.name,
                attacking_team=team_a,
                defending_team=team_b,
                attacker_player_ids=[p.id for p in players_a],
                defender_player_ids=[p.id for p in players_b],
                attacker_dice_sides=sum(p.infantry for p in players_a),
                defender_dice_sides=sum(p.infantry for p in players_b),
            ))
    return battles


def _auto_claim_unowned(players: list[Player], plannets: list[Plannet]) -> None:
    for planet in plannets:
        if planet.current_owner:
            continue
        team_map = _teams_in_orbit(players, planet.cells_in_orbit)
        teams = list(team_map.keys())
        if len(teams) == 1:
            planet.current_owner = teams[0]


def _clone_players(players: list[Player]) -> list[Player]:
    result = []
    for p in players:
        np = Player(p.id, p.name, p.team, p.position)
        np.infantry = p.infantry
        result.append(np)
    return result


def _clone_plannets(plannets: list[Plannet]) -> list[Plannet]:
    return [
        Plannet(pl.name, pl.cell_location, pl.cells_in_orbit, pl.current_owner, pl.resource_stats)
        for pl in plannets
    ]


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
        pending_battles: Optional[list[Battle]] = None,
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
        self.pending_battles = pending_battles or []

    @property
    def active_player(self) -> Player:
        return self.players[self.active_player_index]

    @property
    def team_fuel(self) -> int:
        return self.team_resources.get(self.active_player.team, {}).get('Fuel', 0)

    @property
    def current_battle(self) -> Optional[Battle]:
        return self.pending_battles[0] if self.pending_battles else None

    @staticmethod
    def create(grid: list[list[dict]]) -> GameState:
        players = [
            Player(i, sp['name'], sp['team'], sp['position'])
            for i, sp in enumerate(STARTING_PLAYERS)
        ]
        plannets = Plannet.discover_all(grid)

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

    def apply_move(self, target_pos: Position) -> MoveResult:
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

        new_grid = [[dict(cell) for cell in row] for row in self.grid]
        new_players = _clone_players(self.players)
        new_players[self.active_player_index].move_to(target_pos)
        new_plannets = _clone_plannets(self.plannets)

        # No auto-ownership change — ownership only changes via battles

        new_team_resources = {t: dict(r) for t, r in self.team_resources.items()}
        new_team_resources[active.team]['Fuel'] -= 1

        msg = GameState._build_message(new_grid, new_players[self.active_player_index], self.turn, new_plannets)
        return MoveResult.success(
            GameState(new_grid, new_players, new_plannets, self.active_player_index, self.turn, 'playing', msg, new_team_resources)
        )

    def end_player_turn(self) -> GameState:
        next_player_index = (self.active_player_index + 1) % len(self.players)
        turn_complete = next_player_index == 0

        new_team_resources = {t: dict(r) for t, r in self.team_resources.items()}
        new_plannets = _clone_plannets(self.plannets)

        if turn_complete:
            for planet in new_plannets:
                if planet.current_owner and planet.current_owner in new_team_resources:
                    for key in self.RESOURCE_KEYS:
                        new_team_resources[planet.current_owner][key] += planet.resource_stats.get(key, 0)

            _auto_claim_unowned(self.players, new_plannets)

            battles = _detect_battles(self.players, new_plannets)
            if battles:
                next_turn = self.turn + 1
                msg = f'Turn {next_turn} — {len(battles)} battle(s) to resolve!'
                return GameState(self.grid, self.players, new_plannets, next_player_index, next_turn, 'battling', msg, new_team_resources, battles)

        next_turn = self.turn + 1 if turn_complete else self.turn
        msg = GameState._build_message(self.grid, self.players[next_player_index], next_turn, new_plannets)
        return GameState(self.grid, self.players, new_plannets, next_player_index, next_turn, 'playing', msg, new_team_resources)

    def apply_battle_roll(self, team: str) -> GameState:
        battle = self.current_battle
        if not battle:
            return self

        is_attacker = team == battle.attacking_team
        is_defender = team == battle.defending_team
        if not is_attacker and not is_defender:
            return self
        if is_attacker and battle.attacker_roll is not None:
            return self
        if is_defender and battle.defender_roll is not None:
            return self

        sides = battle.attacker_dice_sides if is_attacker else battle.defender_dice_sides
        roll = _roll_dice(sides)

        new_attacker_roll = roll if is_attacker else battle.attacker_roll
        new_defender_roll = roll if is_defender else battle.defender_roll

        if new_attacker_roll is not None and new_defender_roll is not None:
            if new_attacker_roll == new_defender_roll:
                # Tie — re-roll
                new_battle = Battle(
                    battle.planet_index, battle.planet_name,
                    battle.attacking_team, battle.defending_team,
                    battle.attacker_player_ids, battle.defender_player_ids,
                    battle.attacker_dice_sides, battle.defender_dice_sides,
                )
                new_battles = [new_battle] + self.pending_battles[1:]
                return GameState(self.grid, self.players, self.plannets, self.active_player_index, self.turn, 'battling',
                                 f'Tie on {battle.planet_name}! Roll again.', self.team_resources, new_battles)

            attacker_wins = new_attacker_roll > new_defender_roll
            winner = battle.attacking_team if attacker_wins else (battle.defending_team or battle.attacking_team)

            new_plannets = _clone_plannets(self.plannets)
            new_plannets[battle.planet_index].current_owner = winner

            remaining = self.pending_battles[1:]
            new_status = 'battling' if remaining else 'playing'
            if remaining:
                msg = f'{len(remaining)} battle(s) remaining.'
            else:
                msg = GameState._build_message(self.grid, self.players[self.active_player_index], self.turn, new_plannets)

            return GameState(self.grid, self.players, new_plannets, self.active_player_index, self.turn, new_status, msg, self.team_resources, remaining)

        # Only one team rolled
        new_battle = Battle(
            battle.planet_index, battle.planet_name,
            battle.attacking_team, battle.defending_team,
            battle.attacker_player_ids, battle.defender_player_ids,
            battle.attacker_dice_sides, battle.defender_dice_sides,
            new_attacker_roll, new_defender_roll,
        )
        new_battles = [new_battle] + self.pending_battles[1:]
        msg = f'{team} rolled {roll}! Waiting for opponent...'
        return GameState(self.grid, self.players, self.plannets, self.active_player_index, self.turn, 'battling', msg, self.team_resources, new_battles)

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
