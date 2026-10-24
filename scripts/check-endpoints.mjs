#!/usr/bin/env node
// Fails when a skill, example or eval names an API endpoint that the live OpenAPI does not have.
//
//   node scripts/check-endpoints.mjs                  # checks against the live spec
//   node scripts/check-endpoints.mjs --spec spec.json # checks against a local copy
//
// What counts as an endpoint mention:
//   - inline code in Markdown that starts with a path, with or without a method:
//     `POST /quote/build`, `/vault/{address}/apy`, `GET /partner?network=mainnet`
//   - a line in a code block that starts with a method and a path: `POST /send?network=testnet`
//   - any full URL on the API host, anywhere: https://api.example.com/quote?network=mainnet
//   - in TypeScript, a string literal that starts with a path: '/quote/build', `/vault/${vault}/deposit`
// Path parameters can be written `{name}`, `:name`, `<name>` or `${expr}`. Query strings are ignored.
// Paths that are real but not in the spec (the MCP endpoint, the Swagger page) go in
// scripts/endpoint-allowlist.txt with a reason.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'scripts', 'endpoint-check.json'), 'utf8'))
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const args = process.argv.slice(2)
const specArg = args.includes('--spec') ? args[args.indexOf('--spec') + 1] : null

async function loadSpec() {
  if (specArg) return JSON.parse(readFileSync(specArg, 'utf8'))
  const res = await fetch(CONFIG.specUrl, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`GET ${CONFIG.specUrl} returned ${res.status}`)
  return res.json()
}

function loadAllowlist() {
  const file = join(ROOT, 'scripts', 'endpoint-allowlist.txt')
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean)
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'results', 'dist'].includes(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (['.md', '.ts', '.mts', '.js', '.mjs'].includes(extname(p))) out.push(p)
  }
  return out
}

const PARAM = /^(\{[^}]*\}|:[A-Za-z_]\w*|<[^>]*>|\$\{[^}]*\}|.*(\.\.\.|…).*)$/

function normalize(path) {
  let p = path.split(/[?#]/)[0]
  if (p.length > 1) p = p.replace(/\/+$/, '')
  return p
}

function segments(path) {
  // `${expr}` may contain slashes inside a template literal; collapse it first.
  return normalize(path.replace(/\$\{[^}]*\}/g, '{expr}')).split('/').slice(1)
}

function matches(specPath, mentionPath) {
  const s = specPath.split('/').slice(1)
  const m = segments(mentionPath)
  if (s.length !== m.length) return false
  return s.every((seg, i) => {
    const isParam = /^\{.*\}$/.test(seg)
    const mentionIsParam = PARAM.test(m[i])
    if (isParam) return true
    return !mentionIsParam && seg === m[i]
  })
}

function extract(file) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  const found = []
  const host = CONFIG.apiHost.replace(/\./g, '\\.')
  const urlRe = new RegExp(`https?://${host}(/[^\\s"'\`)<>\\]]*)?`, 'g')
  const pathish = /^\/[A-Za-z][A-Za-z0-9_\-./{}:<>$…]*(\?\S*)?$/
  const ts = /\.(m?ts|m?js)$/.test(file)
  let inFence = false

  lines.forEach((line, i) => {
    const at = `${relative(ROOT, file)}:${i + 1}`
    for (const m of line.matchAll(urlRe)) {
      const path = m[1] || '/'
      if (path === '/') continue
      const before = line.slice(0, m.index)
      const method = METHODS.find((x) => new RegExp(`\\b${x}\\s+$`).test(before)) ||
        (line.match(/-X\s+(GET|POST|PUT|PATCH|DELETE)\b/) || [])[1] || null
      found.push({ at, method, path, raw: m[0] })
    }
    if (ts) {
      for (const m of line.matchAll(/(['"`])(\/[A-Za-z][^'"`\s]*)\1/g)) {
        if (m[2].includes('://')) continue
        // Ignore import specifiers and paths that are clearly files.
        if (/\bfrom\s*$/.test(line.slice(0, m.index)) || /\.(json|ts|js|md|wasm|png)$/.test(m[2])) continue
        found.push({ at, method: null, path: m[2], raw: m[0] })
      }
      return
    }
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return }
    if (inFence) {
      const m = line.match(/^\s*(GET|POST|PUT|PATCH|DELETE)\s+(\/\S*)/)
      if (m) found.push({ at, method: m[1], path: m[2], raw: m[0].trim() })
      return
    }
    const seen = new Set()
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const code = m[1].trim()
      const mm = code.match(/^(?:(GET|POST|PUT|PATCH|DELETE)\s+)?(\/\S*)$/)
      if (!mm || !pathish.test(mm[2])) continue
      seen.add(mm[2])
      found.push({ at, method: mm[1] || null, path: mm[2], raw: code })
    }
    // Prose and headings: "### POST /vault/{address}/deposit", "call GET /partner first".
    for (const m of line.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[A-Za-z][^\s`'"),]*)/g)) {
      if (seen.has(m[2])) continue
      found.push({ at, method: m[1], path: m[2].replace(/[.:;]+$/, ''), raw: m[0] })
    }
  })
  return found
}

const spec = await loadSpec()
const ops = Object.entries(spec.paths).map(([path, item]) => ({
  path,
  methods: Object.keys(item).filter((k) => METHODS.includes(k.toUpperCase())).map((k) => k.toUpperCase()),
}))
const allow = loadAllowlist()
const files = CONFIG.scan.flatMap((d) => {
  const p = join(ROOT, d)
  if (!existsSync(p)) return []
  return statSync(p).isDirectory() ? walk(p) : [p]
})

const errors = []
const used = new Set()
let checked = 0
for (const file of files) {
  for (const f of extract(file)) {
    const path = normalize(f.path)
    if (allow.some((a) => matches(a, path) || normalize(a) === path)) continue
    checked++
    const hits = ops.filter((o) => matches(o.path, path))
    if (!hits.length) {
      errors.push(`${f.at}  ${f.raw}  ->  no such path in the spec`)
      continue
    }
    hits.forEach((h) => used.add(h.path))
    if (f.method && !hits.some((h) => h.methods.includes(f.method))) {
      const have = [...new Set(hits.flatMap((h) => h.methods))].join(', ')
      errors.push(`${f.at}  ${f.raw}  ->  the spec has ${path} only as ${have}`)
    }
  }
}

const unmentioned = ops.filter((o) => !used.has(o.path)).map((o) => `${o.methods.join(',')} ${o.path}`)
console.log(`Checked ${checked} endpoint mentions in ${files.length} files against ${specArg || CONFIG.specUrl}`)
console.log(`${spec.info?.title ?? 'API'} ${spec.info?.version ?? ''}: ${ops.length} paths, ${ops.length - unmentioned.length} mentioned`)
if (unmentioned.length && args.includes('--coverage')) {
  console.log('\nNot mentioned anywhere (informational):')
  unmentioned.forEach((u) => console.log(`  ${u}`))
}
if (errors.length) {
  console.error(`\n${errors.length} endpoint mention(s) contradict the live OpenAPI:\n`)
  errors.forEach((e) => console.error(`  ${e}`))
  console.error('\nFix the skill, or add the path to scripts/endpoint-allowlist.txt with the reason it is not in the spec.')
  process.exit(1)
}
console.log('OK: every endpoint mentioned exists in the spec.')
