// Run: node scripts/sync-fide.js
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from '@supabase/supabase-js'
import { createWriteStream, readFileSync, unlinkSync } from 'fs'
import { get } from 'https'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = join(__dirname, '../.env.local')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const idx = line.indexOf('=')
  if (idx === -1) continue
  const key = line.slice(0, idx).trim()
  const val = line.slice(idx + 1).trim()
  if (key) env[key] = val
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const FIDE_ZIP_URL = 'https://ratings.fide.com/download/standard_rating_list_xml.zip'
const TOP_N = 100
const TMP_ZIP = join(tmpdir(), 'fide_ratings.zip')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' },
})

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      let downloaded = 0
      res.on('data', chunk => {
        downloaded += chunk.length
        process.stdout.write(`\r  Downloading... ${(downloaded / 1024 / 1024).toFixed(1)} MB`)
      })
      res.pipe(file)
      file.on('finish', () => { file.close(); console.log(''); resolve() })
    }).on('error', reject)
  })
}

function unzip(zipPath, outDir) {
  execSync(`unzip -o "${zipPath}" -d "${outDir}"`)
  const files = execSync(`ls "${outDir}"`).toString().split('\n').filter(Boolean)
  const xmlFiles = files.filter(f => f.endsWith('.xml') && !f.toLowerCase().includes('onedrive'))
  if (xmlFiles.length === 0) throw new Error(`No valid XML file found. Files: ${files.join(', ')}`)
  let best = xmlFiles[0]
  let bestSize = 0
  for (const f of xmlFiles) {
    try {
      const size = Number(execSync(`wc -c < "${join(outDir, f)}"`).toString().trim())
      if (size > bestSize) { bestSize = size; best = f }
    } catch {}
  }
  return join(outDir, best)
}

function parseXml(xmlPath) {
  const xml = readFileSync(xmlPath, 'utf8')
  const players = []
  const playerRegex = /<player>([\s\S]*?)<\/player>/g
  let match

  while ((match = playerRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag) => {
      const m = new RegExp(`<${tag}>([^<]*)<\/${tag}>`).exec(block)
      return m ? m[1].trim() : ''
    }

    const rating = Number(get('rating'))
    if (!rating || rating < 2500) continue

    // FIDE marks inactive players with flag 'i' — skip them
    const flag = get('flag')
    if (flag === 'i') continue

    players.push({
      fide_id: get('fideid'),
      name: formatName(get('name')),
      country: get('country'),
      title: get('title').toUpperCase() || null,
      elo: rating,
      peak_elo: rating,
      elo_change_24h: 0,
      win_rate: 0,
      tournament: null,
      is_locked: false,
      updated_at: new Date().toISOString(),
    })
  }

  return players.sort((a, b) => b.elo - a.elo).slice(0, TOP_N)
}

function formatName(raw) {
  const parts = raw.split(',')
  if (parts.length === 2) return `${parts[1].trim()} ${parts[0].trim()}`
  return raw
}

async function main() {
  console.log('ChessX — FIDE Ratings Sync')
  console.log('==========================')

  console.log('\n1. Downloading FIDE standard rating list...')
  await download(FIDE_ZIP_URL, TMP_ZIP)
  console.log(`   Saved to ${TMP_ZIP}`)

  console.log('\n2. Extracting XML...')
  const outDir = join(tmpdir(), 'fide_extract')
  execSync(`mkdir -p "${outDir}"`)
  const xmlPath = unzip(TMP_ZIP, outDir)
  console.log(`   Extracted: ${xmlPath}`)

  console.log('\n3. Parsing top 100 active players...')
  const players = parseXml(xmlPath)
  console.log(`   Found ${players.length} players`)
  console.log(`   Top 5: ${players.slice(0, 5).map(p => `${p.name} (${p.elo})`).join(', ')}`)

  console.log('\n4. Upserting to Supabase...')
  const { error } = await supabase.rpc('sync_players', { p_players: players })

  if (error) {
    console.error('   Supabase error:', error.message)
    process.exit(1)
  }

  console.log(`   ✓ Upserted ${players.length} players`)

  console.log('\n5. Snapshotting rating history...')
  const { data: dbPlayers, error: fetchErr } = await supabase
    .from('players')
    .select('id, fide_id, elo')

  if (fetchErr) {
    console.error('   Could not fetch player IDs for history snapshot:', fetchErr.message)
  } else {
    const fideIdToDbId = new Map(dbPlayers.map(p => [p.fide_id, p.id]))
    const syncedAt = new Date().toISOString()
    const historyRows = players
      .map(p => ({ player_id: fideIdToDbId.get(p.fide_id), elo: p.elo, synced_at: syncedAt }))
      .filter(r => r.player_id)

    const { error: histErr } = await supabase
      .from('rating_history')
      .insert(historyRows)

    if (histErr) {
      console.error('   History snapshot error:', histErr.message)
    } else {
      console.log(`   ✓ Inserted ${historyRows.length} history rows`)
    }
  }

  console.log('\n6. Checking leveraged positions for liquidation...')
  const { data: underwater, error: liqFetchErr } = await supabase
    .from('holdings')
    .select('user_id, player_id, liquidation_price, players(elo)')
    .gt('leverage', 1)
    .not('liquidation_price', 'is', null)

  if (liqFetchErr) {
    console.error('   Could not fetch leveraged holdings:', liqFetchErr.message)
  } else {
    const toliquidate = (underwater ?? []).filter(h => h.players && h.players.elo <= h.liquidation_price)
    if (toliquidate.length === 0) {
      console.log('   ✓ No positions underwater')
    } else {
      for (const h of toliquidate) {
        const { error: liqErr } = await supabase.rpc('liquidate_position', {
          p_user_id: h.user_id,
          p_player_id: h.player_id,
        })
        if (liqErr) {
          console.error(`   Failed to liquidate ${h.user_id}/${h.player_id}:`, liqErr.message)
        } else {
          console.log(`   ✓ Liquidated position: user=${h.user_id.slice(0, 8)} player=${h.player_id.slice(0, 8)} (elo=${h.players.elo} <= liq=${h.liquidation_price})`)
        }
      }
    }
  }

  console.log('\n7. Checking short positions for liquidation...')
  const { data: shortPositions, error: shortFetchErr } = await supabase
    .from('short_positions')
    .select('id, user_id, liquidation_price, players(elo)')

  if (shortFetchErr) {
    console.error('   Could not fetch short positions:', shortFetchErr.message)
  } else {
    const toLiquidateShort = (shortPositions ?? []).filter(s => s.players && s.players.elo >= s.liquidation_price)
    if (toLiquidateShort.length === 0) {
      console.log('   ✓ No short positions at liquidation')
    } else {
      for (const s of toLiquidateShort) {
        const { error: liqErr } = await supabase.rpc('liquidate_short', {
          p_user_id: s.user_id,
          p_short_id: s.id,
        })
        if (liqErr) {
          console.error(`   Failed to liquidate short ${s.user_id.slice(0, 8)}/${s.id.slice(0, 8)}:`, liqErr.message)
        } else {
          console.log(`   ✓ Liquidated short: user=${s.user_id.slice(0, 8)} short=${s.id.slice(0, 8)} (elo=${s.players.elo} >= liq=${s.liquidation_price})`)
        }
      }
    }
  }

  // Cleanup
  try { unlinkSync(TMP_ZIP) } catch {}
  try { unlinkSync(xmlPath) } catch {}

  console.log('\n✓ Sync complete.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
