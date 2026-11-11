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
  const { error } = await supabase
    .from('players')
    .upsert(players, { onConflict: 'fide_id', ignoreDuplicates: false })

  if (error) {
    console.error('   Supabase error:', error.message)
    process.exit(1)
  }

  console.log(`   ✓ Upserted ${players.length} players`)

  // Cleanup
  try { unlinkSync(TMP_ZIP) } catch {}
  try { unlinkSync(xmlPath) } catch {}

  console.log('\n✓ Sync complete.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
