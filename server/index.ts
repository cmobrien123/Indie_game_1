import express from 'express'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const app = express()
const PORT = 3001
const JUNK_FOLDER = join(process.cwd(), 'junk_folder')

app.use(express.json())

// Allow requests from file:// and any localhost origin
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.post('/save-turn', (req, res) => {
  const { cell, turnsPassed } = req.body as { cell: string; turnsPassed: number }
  const csv = `turns_passed,cell\n${turnsPassed},${cell}`
  mkdirSync(JUNK_FOLDER, { recursive: true })
  writeFileSync(join(JUNK_FOLDER, 'game-state.csv'), csv, 'utf8')
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`)
  console.log(`CSV saves to: ${JUNK_FOLDER}`)
})
