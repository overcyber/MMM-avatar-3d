// Teste do mapeamento de humor NeoAlice -> TalkingHead.
// Executar com: node --test tests/
//
// O mapMood existe em tres arquivos (modulo MagicMirror, copia de instalacao e pagina
// independente). Este teste extrai a funcao de cada arquivo e confere que os tres
// respondem igual e cobrem os 14 estados do MoodProfile da NeoAlice.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const files = [
  'MMM-AvatarMQTT/MMM-AvatarMQTT.js',
  'modulo-mmm-avatarmqtt/MMM-AvatarMQTT.js',
  'js/avatar-controller.js',
]

// Extrai o corpo de mapMood contando chaves, sem executar o restante do arquivo.
function loadMapMood(relativePath) {
  const source = readFileSync(join(root, relativePath), 'utf8')
  // Procura a definicao (metodo de classe ou propriedade do Module.register), nao uma chamada.
  const match = /(?:^|\n)\s*mapMood(?::\s*function)?\s*\(/.exec(source)
  assert.ok(match, `definicao de mapMood nao encontrada em ${relativePath}`)
  const start = match.index
  const open = source.indexOf('{', source.indexOf(')', start))
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{')
      depth++
    if (source[i] === '}')
      depth--
    if (depth === 0)
      return new Function('mood', source.slice(open + 1, i))
  }
  throw new Error(`Chaves desbalanceadas em ${relativePath}`)
}

// Mesma tabela do servico alice-companion (overcyber/airi, services/alice-companion/src/mood-vocabulary.ts).
const expected = {
  happy: 'happy',
  playful: 'happy',
  excited: 'happy',
  calm: 'neutral',
  neutral: 'neutral',
  reflective: 'neutral',
  cozy: 'happy',
  tired: 'sleep',
  annoyed: 'angry',
  angry: 'angry',
  sad: 'sad',
  melancholic: 'sad',
  mischief: 'happy',
  grouchy: 'angry',
  sleep: 'sleep',
  love: 'love',
  fear: 'fear',
  disgust: 'disgust',
}

for (const file of files) {
  const mapMood = loadMapMood(file)

  test(`${file}: mapeia todos os humores conhecidos`, () => {
    for (const [mood, talkingheadMood] of Object.entries(expected))
      assert.equal(mapMood(mood), talkingheadMood, `humor ${mood}`)
  })

  test(`${file}: humor desconhecido ou invalido vira neutral`, () => {
    assert.equal(mapMood('stormy'), 'neutral')
    assert.equal(mapMood(''), 'neutral')
    assert.equal(mapMood(undefined), 'neutral')
    assert.equal(mapMood(null), 'neutral')
  })

  test(`${file}: ignora maiusculas e espacos`, () => {
    assert.equal(mapMood('  Love '), 'love')
  })

  test(`${file}: nao confunde chaves do prototipo com humores`, () => {
    assert.equal(mapMood('constructor'), 'neutral')
    assert.equal(mapMood('toString'), 'neutral')
  })
}
