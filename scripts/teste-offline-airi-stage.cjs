// Teste do modulo MMM-AiriStage com o build offline do AIRI, sem internet.
//
// Uma pagina faz o papel do MagicMirror: define Module.register, carrega MMM-AiriStage.js e mostra o DOM do modulo.
// O iframe abre o build do AIRI (VITE_AIRI_OFFLINE=true) que ja deve estar servido em AIRI_URL.
// O navegador bloqueia toda requisicao que nao seja para 127.0.0.1 ou localhost e registra cada uma.
//
// Uso: AIRI_URL=http://127.0.0.1:4173/ node scripts/teste-offline-airi-stage.cjs <pasta de saida>
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const { chromium } = require('playwright')

const outDir = process.argv[2]
const airiUrl = process.env.AIRI_URL ?? 'http://127.0.0.1:4173/'
if (!outDir) {
  console.error('Uso: AIRI_URL=http://127.0.0.1:4173/ node scripts/teste-offline-airi-stage.cjs <pasta de saida>')
  process.exit(2)
}
fs.mkdirSync(outDir, { recursive: true })
const moduleDir = path.join(__dirname, '..', 'MMM-AiriStage')

const mirrorPage = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/modules/MMM-AiriStage/MMM-AiriStage.css"></head>
<body style="margin:0;background:#000">
<script>
  window.Module = { register: (name, definition) => { window.__module = definition } }
</script>
<script src="/modules/MMM-AiriStage/MMM-AiriStage.js"></script>
<script>
  const module = window.__module
  module.config = Object.assign({}, module.defaults, { url: ${JSON.stringify(airiUrl)} })
  document.body.appendChild(module.getDom())
</script></body></html>`

;(async () => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1').pathname
    if (url.startsWith('/modules/MMM-AiriStage/')) {
      const file = path.join(moduleDir, url.slice('/modules/MMM-AiriStage/'.length))
      if (file.startsWith(moduleDir) && fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': file.endsWith('.css') ? 'text/css' : 'application/javascript' })
        fs.createReadStream(file).pipe(res)
        return
      }
    }
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(mirrorPage)
  })
  await new Promise(resolve => server.listen(8080, '127.0.0.1', resolve))

  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const blocked = []
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      return route.continue()
    blocked.push(url.href)
    return route.abort()
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(String(error)))
  await page.goto('http://127.0.0.1:8080/', { timeout: 120_000 })
  const frame = page.frameLocator('iframe.airi-stage-frame')
  // The AIRI header shows the AIRI logo text once the app has mounted.
  await frame.locator('text=AIRI').first().waitFor({ timeout: 180_000 })
  await page.waitForTimeout(10_000)
  await page.screenshot({ path: path.join(outDir, 'airi-no-espelho.png') })
  await browser.close()
  server.close()

  const passed = blocked.length === 0 && pageErrors.length === 0
  fs.writeFileSync(path.join(outDir, 'resultado.json'), JSON.stringify({ passed, blocked, pageErrors }, null, 2))
  console.log(`${passed ? 'PASSOU' : 'FALHOU'}: AIRI carregado no modulo, ${blocked.length} requisicoes externas bloqueadas, ${pageErrors.length} erros de pagina`)
  for (const url of blocked)
    console.log(`  bloqueada: ${url}`)
  process.exitCode = passed ? 0 : 1
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
