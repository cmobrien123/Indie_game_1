import { GameState } from '../src/api/game-state'
import { getAdjacentCells, GRID_ROWS, GRID_COLS } from '../src/utils/grid'
import { exportTurnCSV } from '../src/utils/csv-export'
import { posLabel } from '../src/utils/labels'
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

const gridContainer  = document.getElementById('grid-container')  as HTMLDivElement
const colLabelsEl    = document.getElementById('col-labels')     as HTMLDivElement
const rowLabelsEl    = document.getElementById('row-labels')     as HTMLDivElement
const statusEl       = document.getElementById('status')         as HTMLParagraphElement
const turnCounterEl  = document.getElementById('turn-counter')   as HTMLParagraphElement
const teamStatsEl    = document.getElementById('team-stats')     as HTMLDivElement
const battleOverlay  = document.getElementById('battle-overlay')  as HTMLDivElement
const battleModal    = document.getElementById('battle-modal')    as HTMLDivElement

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

  statusEl.textContent = s.lastMessage
  statusEl.className   = s.status === 'error' ? 'error' : ''
  const ap = s.activePlayer
  const fuel = s.teamFuel
  turnCounterEl.textContent = `Turn ${s.turn} · ${ap.name} · ${posLabel(ap.position)} · Fuel: ${fuel}`

  renderTeamStats(s)
  renderBattle(s)
}

const RESOURCE_KEYS = ['Money', 'RawMaterials', 'Fuel', 'ForceSensitivity']

const renderTeamStats = (s: GameState): void => {
  const teams: { name: string; label: string; cls: string }[] = [
    { name: 'Grand Army of the Republic', label: 'Grand Army of the Republic', cls: 'gar' },
    { name: 'Confederacy of Independent Systems', label: 'Confederacy of Independent Systems', cls: 'cis' },
  ]

  teamStatsEl.innerHTML = ''

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
    teamStatsEl.appendChild(panel)
  }
}

// ── Battle UI ────────────────────────────────────────

const RESULT_DELAY_MS = 4000

const renderBattle = (s: GameState): void => {
  // Show result screen if a battle was just resolved
  if (s.lastBattleResult) {
    battleOverlay.style.display = 'flex'
    const r = s.lastBattleResult
    const b = r.battle
    const attackerLabel = SHORT_TEAM[b.attackingTeam] ?? b.attackingTeam
    const defenderLabel = b.defendingTeam ? (SHORT_TEAM[b.defendingTeam] ?? b.defendingTeam) : 'Unowned'
    const winnerLabel = SHORT_TEAM[r.winner] ?? r.winner

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
      <div class="battle-outcome win">${winnerLabel} keeps ${b.planetName}!</div>
    `
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
    if (state.lastBattleResult) {
      // Battle resolved — show result, then auto-dismiss after delay
      renderGrid(state)
      setTimeout(() => {
        state = state.dismissBattleResult()
        renderGrid(state)
      }, RESULT_DELAY_MS)
    } else {
      renderGrid(state)
    }
  })

  document.getElementById('roll-defender')?.addEventListener('click', () => {
    state = state.applyBattleRoll(b.defendingTeam ?? b.attackingTeam)
    if (state.lastBattleResult) {
      renderGrid(state)
      setTimeout(() => {
        state = state.dismissBattleResult()
        renderGrid(state)
      }, RESULT_DELAY_MS)
    } else {
      renderGrid(state)
    }
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

  state = state.endPlayerTurn()
  renderGrid(state)
  exportTurnCSV(posLabel(state.activePlayer.position), state.turn)
})

renderLabels()
renderGrid(state)
