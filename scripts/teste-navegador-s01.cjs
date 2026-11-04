// Harness de teste da sprint S01 (nao faz parte do repositorio).
// Abre a pagina do avatar com TalkingHead real, envia humores por MQTT e le head.moodName.
// Uso: node scripts/teste-navegador-s01.cjs <pasta de teste> <rotulo> <url base da pagina>
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const [testDir, label, pageBase] = process.argv.slice(2)
const deps = path.join(testDir, 'deps', 'node_modules')
const mqtt = require(path.join(deps, 'mqtt'))
const out = path.join(testDir, `out-${label}`)
fs.mkdirSync(out, { recursive: true })

const moods = ['happy', 'playful', 'excited', 'calm', 'neutral', 'reflective', 'cozy', 'tired', 'annoyed', 'angry', 'sad', 'melancholic', 'mischief', 'grouchy', 'sleep', 'love', 'fear', 'disgust', ' Love ', 'constructor']
const shots = new Set(['happy', 'love', 'fear', 'disgust', 'sad', 'sleep'])

function rewriteIndex(html) {
  // Troca so os enderecos da rede do usuario por servicos locais. O codigo do avatar nao muda.
  return html
    .replace(/http:\/\/[\d.]+:8081\/modules\/talkinghead\.mjs/, 'http://127.0.0.1:8081/modules/talkinghead.mjs')
    .replace(/brokerUrl: '[^']+'/, 'brokerUrl: \'ws://127.0.0.1:18831\'')
    .replace(/avatarURL: '[^']+'/, 'avatarURL: \'http://127.0.0.1:8081/avatars/eva-ruiva-arkit.glb\'')
    .replace('const mqttClient = new MqttClient(CONFIG, avatarController);', 'const mqttClient = new MqttClient(CONFIG, avatarController);\n        window.__avatar = avatarController;')
}

;(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights'] })
  const context = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 })
  const blocked = []
  const pageErrors = []
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') {
      if (url.pathname === '/index.html') {
        const response = await route.fetch()
        return route.fulfill({ response, body: rewriteIndex(await response.text()) })
      }
      return route.continue()
    }
    if (url.href.startsWith('https://unpkg.com/mqtt'))
      return route.fulfill({ path: path.join(deps, 'mqtt/dist/mqtt.min.js'), contentType: 'application/javascript' })
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/three@0.161.0/'))
      return route.fulfill({ path: path.join(deps, 'three', url.pathname.replace('/npm/three@0.161.0/', '')), contentType: 'application/javascript' })
    // talkinghead.mjs importa o Three.js direto do esm.sh. O modulo raiz reexporta o mesmo arquivo
    // do importmap, para existir uma unica instancia do Three.js na pagina.
    if (url.hostname === 'esm.sh' && url.pathname === '/three@0.161.0')
      return route.fulfill({ body: "export * from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js'", contentType: 'application/javascript' })
    if (url.hostname === 'esm.sh' && url.pathname.startsWith('/three@0.161.0/'))
      return route.fulfill({ path: path.join(deps, 'three', url.pathname.replace('/three@0.161.0/', '')), contentType: 'application/javascript' })
    blocked.push(url.href)
    return route.abort()
  })

  const page = await context.newPage()
  page.on('pageerror', error => pageErrors.push(String(error)))
  const consoleLines = []
  page.on('console', msg => consoleLines.push(`[${msg.type()}] ${msg.text()}`))
  page.on('requestfailed', req => consoleLines.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`))
  const started = Date.now()
  await page.goto(`${pageBase}/index.html`)
  try {
    await page.waitForFunction(() => window.__avatar?.head?.avatar && document.getElementById('mqtt-status-text')?.textContent.includes('Conectado'), null, { timeout: Number(process.env.LOAD_TIMEOUT || 180000) })
  }
  catch (error) {
    await page.screenshot({ path: path.join(out, 'falha-carregamento.png') })
    const debug = await page.evaluate(() => ({ log: document.getElementById('debug-messages')?.innerText, loading: document.getElementById('loading-text')?.innerText, mqtt: document.getElementById('mqtt-status-text')?.innerText, avatar: !!window.__avatar?.head?.avatar }))
    console.log(JSON.stringify({ debug, pageErrors, blocked, console: consoleLines.slice(-30) }, null, 2))
    throw error
  }
  const loadSeconds = ((Date.now() - started) / 1000).toFixed(1)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(out, '00-carregado.png') })

  const client = mqtt.connect('mqtt://127.0.0.1:18830')
  await new Promise(resolve => client.on('connect', resolve))
  const publish = (topic, body) => new Promise(resolve => client.publish(topic, JSON.stringify(body), { qos: 1 }, resolve))

  const results = []
  for (const mood of moods) {
    await publish('neoalice/v1/view/evt/mood', { v: 1, type: 'evt.mood', site_id: 'view', mood })
    await page.waitForTimeout(shots.has(mood) ? 2500 : 600)
    const state = await page.evaluate(() => ({ controller: window.__avatar.currentMood, applied: window.__avatar.head.moodName }))
    results.push({ sent: mood, ...state })
    if (shots.has(mood))
      await page.screenshot({ path: path.join(out, `mood-${mood}.png`) })
  }

  await publish('neoalice/v1/view/evt/mood', { mood: 'neutral' })
  await publish('neoalice/v1/view/cmd/avatar/gesture', { gesture: 'thumbup', duration: 3 })
  await page.waitForTimeout(1500)
  const gestureActive = await page.evaluate(() => window.__avatar.head.gesture !== null)
  await page.screenshot({ path: path.join(out, 'gesto-thumbup.png') })
  await publish('neoalice/v1/view/cmd/avatar/pose', { pose: 'straight' })
  await page.waitForTimeout(1500)
  await publish('neoalice/v1/view/cmd/avatar/animation', { url: 'http://127.0.0.1:8081/animations/walking.fbx', duration: 5 })
  await page.waitForTimeout(4000)
  const animationActive = await page.evaluate(() => window.__avatar.head.mixer !== null)
  await page.screenshot({ path: path.join(out, 'animacao-walking.png') })

  const report = { label, loadSeconds, results, gestureActive, animationActive, pageErrors, blocked }
  fs.writeFileSync(path.join(out, 'resultado.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ label, loadSeconds, gestureActive, animationActive, pageErrors: pageErrors.length, blocked: blocked.length }))
  for (const r of results)
    console.log(`${label}\t${JSON.stringify(r.sent).padEnd(14)}\tcontroller=${String(r.controller).padEnd(10)}\tTalkingHead=${r.applied}`)
  client.end()
  await browser.close()
})().catch((error) => {
  console.error('FALHA DO HARNESS:', error)
  process.exit(1)
})
