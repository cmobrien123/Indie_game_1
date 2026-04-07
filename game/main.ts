import { GameState } from '../src/api/game-state'
import { getAdjacentCells, GRID_ROWS, GRID_COLS } from '../src/utils/grid'
import { exportTurnCSV } from '../src/utils/csv-export'
import { posLabel } from '../src/utils/labels'
import { findNearestCell3 } from '../src/utils/pathfinding'
import type { Position } from '../src/types/game'

// Hex cell dimensions (pointy-top, odd-r offset)
const HEX_W = 30          // cell width in px
const HEX_H = 34          // cell height in px
const HEX_V_STEP = 26     // vertical distance between row tops (HEX_H * ~0.75)
const ODD_OFFSET = 15     // horizontal shift for odd rows (HEX_W / 2)

const colLabelChar = (col: number) => {
  if (col < 26) return String.fromCharCode(65 + col)
  return String.fromCharCode(64 + Math.floor(col / 26)) + String.fromCharCode(65 + (col % 26))
}
const rowLabelNum = (row: number) => String(row + 1)

const TEAM_CLASS: Record<string, string> = {
  'Grand Army of the Republic': 'team-gar',
  'Confederacy of Independent Systems': 'team-cis',
}

const SHORT_TEAM: Record<string, string> = {
  'Grand Army of the Republic': 'Republic',
  'Confederacy of Independent Systems': 'Separatists',
}

let state = GameState.create()
let placingPlayer = false

const gridContainer  = document.getElementById('grid-container')  as HTMLDivElement
const colLabelsEl    = document.getElementById('col-labels')     as HTMLDivElement
const rowLabelsEl    = document.getElementById('row-labels')     as HTMLDivElement
const statusEl       = document.getElementById('status')         as HTMLParagraphElement
const turnCounterEl  = document.getElementById('turn-counter')   as HTMLParagraphElement
const teamStatsLeft  = document.getElementById('team-stats-left')  as HTMLDivElement
const teamStatsRight = document.getElementById('team-stats-right') as HTMLDivElement
const battleOverlay  = document.getElementById('battle-overlay')  as HTMLDivElement
const battleModal    = document.getElementById('battle-modal')    as HTMLDivElement
const cellTooltip    = document.getElementById('cell-tooltip')    as HTMLDivElement

const renderLabels = (): void => {
  colLabelsEl.innerHTML = ''
  for (let col = 0; col < GRID_COLS; col++) {
    const el = document.createElement('div')
    el.className = 'col-label'
    el.textContent = colLabelChar(col)
    colLabelsEl.appendChild(el)
  }

  const totalH = (GRID_ROWS - 1) * HEX_V_STEP + HEX_H
  rowLabelsEl.style.height = `${totalH}px`
  rowLabelsEl.innerHTML = ''
  for (let row = 0; row < GRID_ROWS; row++) {
    const el = document.createElement('div')
    el.className = 'row-label'
    el.textContent = rowLabelNum(row)
    el.style.top = `${row * HEX_V_STEP + HEX_H / 2}px`
    rowLabelsEl.appendChild(el)
  }
}

const renderGrid = (s: GameState): void => {
  const active = s.activePlayer
  const adjacentSet = new Set(
    getAdjacentCells(s.grid, active.position).map(c => `${c.position.row},${c.position.col}`)
  )

  const planetNameByCell = new Map<string, string>()
  for (const planet of s.plannets) {
    planetNameByCell.set(`${planet.cellLocation.row},${planet.cellLocation.col}`, planet.name)
  }

  const orbitOwnerByCell = new Map<string, string>()
  for (const planet of s.plannets) {
    if (!planet.currentOwner) continue
    const teamCls = TEAM_CLASS[planet.currentOwner]
    for (const o of planet.cellsInOrbit) {
      orbitOwnerByCell.set(`${o.row},${o.col}`, teamCls)
    }
  }

  // Build set of valid placement cells during placement mode
  const placementCells = new Set<string>()
  if (placingPlayer) {
    const team = s.activePlayer.team
    for (const planet of s.plannets) {
      if (planet.currentOwner !== team) continue
      for (const o of planet.cellsInOrbit) {
        if (s.grid[o.row]?.[o.col]?.accessible) {
          placementCells.add(`${o.row},${o.col}`)
        }
      }
    }
  }

  const playersByCell = new Map<string, typeof s.players>()
  for (const player of s.players) {
    const key = `${player.position.row},${player.position.col}`
    const list = playersByCell.get(key) ?? []
    list.push(player)
    playersByCell.set(key, list)
  }

  gridContainer.style.width  = `${GRID_COLS * HEX_W + ODD_OFFSET}px`
  gridContainer.style.height = `${(GRID_ROWS - 1) * HEX_V_STEP + HEX_H}px`
  gridContainer.innerHTML = ''

  for (let row = 0; row < s.grid.length; row++) {
    for (let col = 0; col < s.grid[row].length; col++) {
      const cell = s.grid[row][col]
      const el   = document.createElement('div')
      el.className       = 'cell'
      el.dataset['row']  = String(row)
      el.dataset['col']  = String(col)
      el.style.left      = `${col * HEX_W + (row % 2 === 1 ? ODD_OFFSET : 0)}px`
      el.style.top       = `${row * HEX_V_STEP}px`

      el.classList.add(`cell-${cell.cellValue}`)

      const cellKey = `${row},${col}`
      const playersHere = playersByCell.get(cellKey)

      if (playersHere && playersHere.length > 0) {
        const isActive = playersHere.some(p => p.id === active.id)
        const teamClass = TEAM_CLASS[playersHere[0].team]
        el.classList.add('occupied', teamClass)
        if (isActive) el.classList.add('active-player')

        const marker = document.createElement('span')
        marker.className = 'player-marker'
        marker.textContent = playersHere.length > 1 ? `▲${playersHere.length}` : '▲'
        el.appendChild(marker)
      } else if (adjacentSet.has(cellKey)) {
        el.classList.add('adjacent')
      }

      const orbitTeam = orbitOwnerByCell.get(cellKey)
      if (orbitTeam && !(playersHere && playersHere.length > 0)) {
        el.classList.add('orbit-owned', `orbit-${orbitTeam}`)
      }

      if (placementCells.has(cellKey)) {
        el.classList.add('placement-target')
      }

      gridContainer.appendChild(el)
    }
  }

  for (const planet of s.plannets) {
    const { row, col } = planet.cellLocation
    const label = document.createElement('span')
    label.className = 'planet-label'
    label.textContent = planet.name
    label.style.left = `${col * HEX_W + (row % 2 === 1 ? ODD_OFFSET : 0) + HEX_W / 2}px`
    label.style.top  = `${row * HEX_V_STEP - 10}px`
    gridContainer.appendChild(label)
  }

  // Render player name + experience level labels above player positions
  for (const player of s.players) {
    const { row, col } = player.position
    const label = document.createElement('span')
    label.className = 'player-label'
    label.innerHTML = `${player.name}<br>(${player.experienceLevel})<br>${player.infantry}`
    label.style.left = `${col * HEX_W + (row % 2 === 1 ? ODD_OFFSET : 0) + HEX_W / 2}px`
    label.style.top  = `${row * HEX_V_STEP - 26}px`
    gridContainer.appendChild(label)
  }

  if (!placingPlayer) {
    statusEl.textContent = s.lastMessage
    statusEl.className   = s.status === 'error' ? 'error' : ''
  }
  const ap = s.activePlayer
  const fuel = s.teamFuel
  turnCounterEl.textContent = `Turn ${s.turn} · ${ap.name} · ${posLabel(ap.position)} · Fuel: ${fuel}`

  // Update create player button text
  const cpBtn = document.getElementById('create-player-btn') as HTMLButtonElement | null
  if (cpBtn) {
    cpBtn.textContent = placingPlayer ? 'Cancel Placement' : 'Create Player'
    cpBtn.style.display = s.status === 'playing' ? '' : 'none'
  }

  renderTeamStats(s)
  renderPlanetSummary(s)
  renderBattle(s)
}

const RESOURCE_KEYS = ['Money', 'RawMaterials', 'Fuel', 'ForceSensitivity']

const getNearestPlanetName = (s: GameState, playerPos: Position): string => {
  const nearest = findNearestCell3(s.grid, playerPos)
  if (!nearest) return '—'
  const planet = s.plannets.find(
    p => p.cellLocation.row === nearest.row && p.cellLocation.col === nearest.col
  )
  return planet ? planet.name : '—'
}

const buildPlayerDetailTable = (s: GameState, teamName: string): string => {
  const teamPlayers = s.players.filter(p => p.team === teamName)
  if (teamPlayers.length === 0) return '<div style="font-size:0.65rem;color:#666;">No players</div>'

  const rows = teamPlayers.map(p =>
    `<tr>
      <td>${p.name}</td>
      <td>${p.infantry}</td>
      <td>${p.experienceLevel}</td>
      <td>${p.experience}</td>
      <td>${getNearestPlanetName(s, p.position)}</td>
    </tr>`
  ).join('')

  return `
    <table>
      <thead><tr>
        <th>Name</th>
        <th>Infantry</th>
        <th>Level</th>
        <th>XP</th>
        <th>Nearest Planet</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

const renderTeamStats = (s: GameState): void => {
  const teams: { name: string; label: string; cls: string }[] = [
    { name: 'Grand Army of the Republic', label: 'Grand Army of the Republic', cls: 'gar' },
    { name: 'Confederacy of Independent Systems', label: 'Confederacy of Independent Systems', cls: 'cis' },
  ]

  teamStatsLeft.innerHTML = ''
  teamStatsRight.innerHTML = ''

  for (const team of teams) {
    const playerCount = s.players.filter(p => p.team === team.name).length
    const ownedPlannets = s.plannets.filter(p => p.currentOwner === team.name)
    const plannetCount = ownedPlannets.length

    const income: Record<string, number> = {}
    for (const key of RESOURCE_KEYS) income[key] = 0
    for (const planet of ownedPlannets) {
      for (const key of RESOURCE_KEYS) {
        income[key] += planet.resourceStats[key] ?? 0
      }
    }

    const accumulated = s.teamResources[team.name] ?? {}

    // Player detail table (left of GAR summary, right of CIS summary)
    const detailPanel = document.createElement('div')
    detailPanel.className = 'player-detail-table'
    detailPanel.innerHTML = `
      <h3>${team.label} — Player Details</h3>
      ${buildPlayerDetailTable(s, team.name)}
    `

    // Team summary panel
    const panel = document.createElement('div')
    panel.className = `team-panel ${team.cls}`
    panel.innerHTML = `
      <h2>${team.label}</h2>
      <div class="stat-row"><span class="stat-label">Players</span><span class="stat-value">${playerCount}</span></div>
      <div class="stat-row"><span class="stat-label">Infantry</span><span class="stat-value">${s.players.filter(p => p.team === team.name).reduce((sum, p) => sum + p.infantry, 0)}</span></div>
      <div class="stat-row"><span class="stat-label">Plannets</span><span class="stat-value">${plannetCount}</span></div>
      <hr class="stat-divider">
      ${RESOURCE_KEYS.map(k =>
        `<div class="stat-row"><span class="stat-label">${k}</span><span class="stat-value">${accumulated[k] ?? 0} <span style="color:#888">(+${income[k]}/turn)</span></span></div>`
      ).join('')}
    `

    if (team.cls === 'gar') {
      teamStatsLeft.appendChild(detailPanel)
      teamStatsLeft.appendChild(panel)
    } else {
      teamStatsRight.appendChild(panel)
      teamStatsRight.appendChild(detailPanel)
    }
  }
}

const planetSummaryEl = document.getElementById('planet-summary') as HTMLDivElement

type PlanetSortKey = 'Name' | 'Owner' | 'Money' | 'RawMaterials' | 'Fuel'
let planetSortKey: PlanetSortKey = 'Name'
let planetSortAsc = true

const getPlanetSortValue = (p: { name: string; currentOwner: string | null; resourceStats: Record<string, number> }, key: PlanetSortKey): string | number => {
  switch (key) {
    case 'Name': return p.name
    case 'Owner': return p.currentOwner ?? ''
    case 'Money': return p.resourceStats.Money ?? 0
    case 'RawMaterials': return p.resourceStats.RawMaterials ?? 0
    case 'Fuel': return p.resourceStats.Fuel ?? 0
  }
}

const renderPlanetSummary = (s: GameState): void => {
  const sorted = [...s.plannets].sort((a, b) => {
    const va = getPlanetSortValue(a, planetSortKey)
    const vb = getPlanetSortValue(b, planetSortKey)
    let cmp = 0
    if (typeof va === 'string' && typeof vb === 'string') {
      cmp = va.localeCompare(vb)
    } else {
      cmp = (va as number) - (vb as number)
    }
    return planetSortAsc ? cmp : -cmp
  })

  const rows = sorted.map(p => {
    let ownerClass = 'owner-none'
    let ownerLabel = 'Unowned'
    if (p.currentOwner === 'Grand Army of the Republic') {
      ownerClass = 'owner-gar'
      ownerLabel = 'Republic'
    } else if (p.currentOwner === 'Confederacy of Independent Systems') {
      ownerClass = 'owner-cis'
      ownerLabel = 'Separatists'
    }
    return `<tr>
      <td>${p.name}</td>
      <td class="${ownerClass}">${ownerLabel}</td>
      <td>${p.resourceStats.Money ?? 0}</td>
      <td>${p.resourceStats.RawMaterials ?? 0}</td>
      <td>${p.resourceStats.Fuel ?? 0}</td>
    </tr>`
  }).join('')

  const arrow = (key: PlanetSortKey) =>
    planetSortKey === key ? (planetSortAsc ? ' ▲' : ' ▼') : ''

  const columns: PlanetSortKey[] = ['Name', 'Owner', 'Money', 'RawMaterials', 'Fuel']
  const headerCells = columns.map(key =>
    `<th class="sortable" data-sort-key="${key}">${key}${arrow(key)}</th>`
  ).join('')

  planetSummaryEl.innerHTML = `
    <h3>Planet Summary</h3>
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `

  planetSummaryEl.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = (th as HTMLElement).dataset['sortKey'] as PlanetSortKey
      if (planetSortKey === key) {
        planetSortAsc = !planetSortAsc
      } else {
        planetSortKey = key
        planetSortAsc = true
      }
      renderPlanetSummary(s)
    })
  })
}

// ── Battle UI ────────────────────────────────────────

const renderBattle = (s: GameState): void => {
  // Show result screen if a battle was just resolved
  if (s.lastBattleResult) {
    battleOverlay.style.display = 'flex'
    const r = s.lastBattleResult
    const b = r.battle
    const attackerLabel = SHORT_TEAM[b.attackingTeam] ?? b.attackingTeam
    const defenderLabel = b.defendingTeam ? (SHORT_TEAM[b.defendingTeam] ?? b.defendingTeam) : 'Unowned'
    const casualtyHtml = r.casualties.length > 0
      ? `<div style="margin-top:10px;text-align:left;">
          <div style="font-size:0.75rem;color:#999;margin-bottom:4px;text-align:center;">Casualties (margin: ${r.margin})</div>
          ${r.casualties.map(c =>
            `<div style="font-size:0.7rem;color:${c.removed ? '#e74c3c' : '#f39c12'};padding:2px 0;">
              ${c.playerName}: ${c.outcome} — ${c.removed ? 'REMOVED' : `${c.infantryBefore} → ${c.infantryAfter} infantry`}
            </div>`
          ).join('')}
        </div>`
      : ''

    battleModal.innerHTML = `
      <h2>Battle Result</h2>
      <div class="battle-planet">${b.planetName}</div>
      <div class="battle-sides">
        <div class="battle-side attacker">
          <h3>${attackerLabel} (Attacker)</h3>
          <div class="side-info">Dice: d${b.attackerDiceSides}</div>
          <div class="dice-result">${b.attackerRoll}</div>
        </div>
        <div class="battle-side defender">
          <h3>${defenderLabel} (Defender${b.defendingTeam ? ' +8' : ''})</h3>
          <div class="side-info">Dice: d${b.defenderDiceSides}</div>
          <div class="dice-result">${b.defenderRoll}</div>
        </div>
      </div>
      <div style="font-size:0.85rem;color:#ccc;margin:8px 0;">${attackerLabel}: ${b.attackerRoll} vs ${defenderLabel}: ${b.defenderRoll}</div>
      <div class="battle-outcome win">${r.winner === b.defendingTeam ? `${r.winner} maintains control of ${b.planetName}.` : `${r.winner} takes control of ${b.planetName}.`}</div>
      ${casualtyHtml}
      <button id="battle-continue-btn">Continue</button>
    `

    document.getElementById('battle-continue-btn')?.addEventListener('click', () => {
      state = state.dismissBattleResult()
      renderGrid(state)
    })
    return
  }

  if (s.status !== 'battling' || !s.currentBattle) {
    battleOverlay.style.display = 'none'
    return
  }

  battleOverlay.style.display = 'flex'
  const b = s.currentBattle

  const attackerNames = b.attackerPlayerIds.map(id => s.players.find(p => p.id === id)?.name ?? '?').join(', ')
  const defenderNames = b.defenderPlayerIds.map(id => s.players.find(p => p.id === id)?.name ?? '?').join(', ')
  const attackerLabel = SHORT_TEAM[b.attackingTeam] ?? b.attackingTeam
  const defenderLabel = b.defendingTeam ? (SHORT_TEAM[b.defendingTeam] ?? b.defendingTeam) : 'Unowned'

  let scoreHtml = ''
  if (b.attackerRoll !== null || b.defenderRoll !== null) {
    scoreHtml = `<div style="font-size:0.85rem;color:#ccc;margin:8px 0;">${attackerLabel}: ${b.attackerRoll ?? '—'} vs ${defenderLabel}: ${b.defenderRoll ?? '—'}</div>`
  }

  let outcomeHtml = ''
  if (b.attackerRoll !== null && b.defenderRoll !== null && b.attackerRoll === b.defenderRoll) {
    outcomeHtml = `<div class="battle-outcome tie">Tie! Roll again.</div>`
  }

  battleModal.innerHTML = `
    <h2>Battle!</h2>
    <div class="battle-planet">${b.planetName}</div>
    <div class="battle-sides">
      <div class="battle-side attacker">
        <h3>${attackerLabel} (Attacker)</h3>
        <div class="side-info">${attackerNames}</div>
        <div class="side-info">Dice: d${b.attackerDiceSides}</div>
        <div class="dice-result">${b.attackerRoll !== null ? b.attackerRoll : ''}</div>
        <button class="roll-btn" id="roll-attacker" ${b.attackerRoll !== null ? 'disabled' : ''}>${b.attackerRoll !== null ? 'Rolled' : 'Roll'}</button>
      </div>
      <div class="battle-side defender">
        <h3>${defenderLabel} (Defender${b.defendingTeam ? ' +8' : ''})</h3>
        <div class="side-info">${defenderNames || 'No units in orbit'}</div>
        <div class="side-info">Dice: d${b.defenderDiceSides}</div>
        <div class="dice-result">${b.defenderRoll !== null ? b.defenderRoll : ''}</div>
        <button class="roll-btn" id="roll-defender" ${b.defenderRoll !== null ? 'disabled' : ''}>${b.defenderRoll !== null ? 'Rolled' : 'Roll'}</button>
      </div>
    </div>
    ${scoreHtml}
    ${outcomeHtml}
  `

  document.getElementById('roll-attacker')?.addEventListener('click', () => {
    state = state.applyBattleRoll(b.attackingTeam)
    renderGrid(state)
  })

  document.getElementById('roll-defender')?.addEventListener('click', () => {
    state = state.applyBattleRoll(b.defendingTeam ?? b.attackingTeam)
    renderGrid(state)
  })
}

// ── Event handlers ───────────────────────────────────

gridContainer.addEventListener('click', (e: MouseEvent) => {
  if (state.status === 'battling') return

  const target = e.target as HTMLElement
  const cell = target.closest('.cell') as HTMLElement | null
  if (!cell) return

  const targetPos: Position = {
    row: Number(cell.dataset['row']),
    col: Number(cell.dataset['col']),
  }

  if (placingPlayer) {
    const result = state.recruitPlayer(targetPos)
    if (result.ok) {
      state = result.state
      placingPlayer = false
      renderGrid(state)
    } else {
      statusEl.textContent = result.reason
      statusEl.className = 'error'
    }
    return
  }

  const result = state.applyMove(targetPos)
  if (result.ok) {
    state = result.state
    renderGrid(state)
  } else {
    statusEl.textContent = result.reason
    statusEl.className   = 'error'
  }
})

const endMoveBtn = document.getElementById('end-move-btn') as HTMLButtonElement
endMoveBtn.addEventListener('click', () => {
  if (state.status === 'battling') return
  placingPlayer = false

  state = state.endPlayerTurn()
  renderGrid(state)
  exportTurnCSV(posLabel(state.activePlayer.position), state.turn)
})

const createPlayerBtn = document.getElementById('create-player-btn') as HTMLButtonElement
createPlayerBtn.addEventListener('click', () => {
  if (state.status === 'battling') return

  if (placingPlayer) {
    // Cancel placement
    placingPlayer = false
    renderGrid(state)
    return
  }

  if (!state.canRecruit) {
    statusEl.textContent = 'Not enough resources to recruit a new unit'
    statusEl.className = 'error'
    return
  }

  placingPlayer = true
  statusEl.textContent = 'Click a friendly orbit cell to place new unit'
  statusEl.className = ''
  renderGrid(state)
})

gridContainer.addEventListener('mousemove', (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const cell = target.closest('.cell') as HTMLElement | null
  if (!cell) {
    cellTooltip.style.display = 'none'
    return
  }
  const row = Number(cell.dataset['row'])
  const col = Number(cell.dataset['col'])
  cellTooltip.textContent = `${colLabelChar(col)}${rowLabelNum(row)}`
  cellTooltip.style.display = 'block'
  cellTooltip.style.left = `${e.clientX + 12}px`
  cellTooltip.style.top  = `${e.clientY + 12}px`
})

gridContainer.addEventListener('mouseleave', () => {
  cellTooltip.style.display = 'none'
})

renderLabels()
renderGrid(state)
