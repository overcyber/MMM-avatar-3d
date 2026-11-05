// Teste offline do modulo MMM-AvatarMQTT: carrega o TalkingHead real e o avatar sem internet.
//
// Sobe dois servidores locais, como no espelho:
// - 127.0.0.1:8080 faz o papel do MagicMirror e serve a pasta do modulo em /modules/MMM-AvatarMQTT/.
// - 127.0.0.1:8081 faz o papel do servidor TalkingHead local e serve /modules/ e /avatars/.
// O navegador bloqueia toda requisicao que nao seja para 127.0.0.1 e registra cada uma.
//
// Uso: node scripts/teste-offline-modulo.cjs <pasta do servidor TalkingHead> <pasta de saida> [avatar.glb]
// Requisitos: Playwright com Chromium, e `npm install` feito na pasta MMM-AvatarMQTT.
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const { chromium } = require('playwright')

const [talkingHeadDir, outDir, avatarFile = 'eva2.glb'] = process.argv.slice(2)
if (!talkingHeadDir || !outDir) {
  console.error('Uso: node scripts/teste-offline-modulo.cjs <pasta do servidor TalkingHead> <pasta de saida> [avatar.glb]')
  process.exit(2)
}
const moduleDir = path.join(__dirname, '..', 'MMM-AvatarMQTT')
fs.mkdirSync(outDir, { recursive: true })

const types = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json', '.html': 'text/html', '.fbx': 'application/octet-stream' }

function serve(port, routes) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname)
    for (const [prefix, dir] of routes) {
      if (!url.startsWith(prefix))
        continue
      const file = path.join(dir, url.slice(prefix.length))
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
        break
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Access-Control-Allow-Origin': '*' })
      fs.createReadStream(file).pipe(res)
      return
    }
    res.writeHead(404)
    res.end()
  })
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)))
}

/** Roda o metodo buildImportMap do modulo, sem executar o restante do arquivo. */
function buildImportMap() {
  const source = fs.readFileSync(path.join(moduleDir, 'MMM-AvatarMQTT.js'), 'utf8')
  const start = source.indexOf('buildImportMap: function()')
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{')
      depth++
    if (source[i] === '}')
      depth--
    if (depth === 0) {
      // eslint-disable-next-line no-new-func
      const method = new Function(source.slice(open + 1, i))
      return method.call({
        config: { threeBaseURL: '/modules/MMM-AvatarMQTT/node_modules/three' },
        talkingHeadModuleURL: 'http://127.0.0.1:8081/modules/talkinghead.mjs',
      })
    }
  }
  throw new Error('buildImportMap nao encontrado')
}

const page = importMap => `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">${JSON.stringify(importMap)}</script></head>
<body style="margin:0;background:#000"><div id="avatar" style="width:540px;height:960px"></div>
<script type="module">
  try {
    const { TalkingHead } = await import('talkinghead')
    const head = new TalkingHead(document.getElementById('avatar'), {
      ttsEndpoint: 'silent://notts.local', lipsyncModules: ['en'], cameraView: 'full',
    })
    await head.showAvatar({ url: 'http://127.0.0.1:8081/avatars/${avatarFile}', body: 'F', avatarMood: 'happy', lipsyncLang: 'en' })
    window.__result = { ok: true, mood: head.moodName }
  } catch (error) {
    window.__result = { ok: false, error: String(error) }
  }
</script></body></html>`

;(async () => {
  const importMap = buildImportMap()
  const testPageDir = fs.mkdtempSync(path.join(outDir, 'pagina-'))
  fs.writeFileSync(path.join(testPageDir, 'index.html'), page(importMap))
  const mirror = await serve(8080, [['/modules/MMM-AvatarMQTT/', moduleDir], ['/', testPageDir]])
  const talkingHead = await serve(8081, [['/modules/', path.join(talkingHeadDir, 'modules')], ['/avatars/', path.join(talkingHeadDir, 'avatars')]])

  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const context = await browser.newContext({ viewport: { width: 540, height: 960 } })
  const blocked = []
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1')
      return route.continue()
    blocked.push(url.href)
    return route.abort()
  })
  const tab = await context.newPage()
  const pageErrors = []
  tab.on('pageerror', error => pageErrors.push(String(error)))
  await tab.goto('http://127.0.0.1:8080/index.html')
  await tab.waitForFunction(() => window.__result, null, { timeout: 180_000 })
  const result = await tab.evaluate(() => window.__result)
  await tab.waitForTimeout(2000)
  await tab.screenshot({ path: path.join(outDir, 'avatar-offline.png') })
  await browser.close()
  mirror.close()
  talkingHead.close()

  const report = { result, blocked, pageErrors, importMap }
  fs.writeFileSync(path.join(outDir, 'resultado.json'), JSON.stringify(report, null, 2))
  const passed = result.ok && blocked.length === 0 && pageErrors.length === 0
  console.log(`${passed ? 'PASSOU' : 'FALHOU'}: avatar ${result.ok ? 'carregado' : `nao carregado (${result.error})`}, ${blocked.length} requisicoes externas bloqueadas, ${pageErrors.length} erros de pagina`)
  for (const url of blocked)
    console.log(`  bloqueada: ${url}`)
  process.exitCode = passed ? 0 : 1
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
