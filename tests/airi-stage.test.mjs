// Teste do modulo MMM-AiriStage.
// Executar com: node --test tests/airi-stage.test.mjs
//
// Carrega o modulo com um Module.register e um document minimos, sem MagicMirror.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function element(tag) {
  return {
    tag,
    attributes: {},
    style: {},
    children: [],
    setAttribute(name, value) {
      this.attributes[name] = value
    },
    appendChild(child) {
      this.children.push(child)
    },
  }
}

function loadModule(config = {}) {
  let definition
  const context = {
    Module: { register: (_name, value) => { definition = value } },
    document: { createElement: element },
  }
  vm.runInNewContext(readFileSync(join(root, 'MMM-AiriStage/MMM-AiriStage.js'), 'utf8'), context)
  return { ...definition, config: { ...definition.defaults, ...config } }
}

test('mostra o AIRI local num iframe com audio e microfone', () => {
  const module = loadModule()
  const wrapper = module.getDom()
  const frame = wrapper.children[0]

  assert.equal(frame.tag, 'iframe')
  assert.equal(frame.src, 'http://localhost:4173/')
  assert.equal(frame.attributes.allow, 'autoplay; microphone')
  assert.equal(frame.style.background, 'transparent')
  assert.equal(wrapper.style.height, '100vh')
})

test('usa o endereco e o tamanho da configuracao', () => {
  const module = loadModule({ url: 'http://localhost:5174/', width: '600px', height: '900px', transparent: false })
  const wrapper = module.getDom()

  assert.equal(wrapper.children[0].src, 'http://localhost:5174/')
  assert.equal(wrapper.style.width, '600px')
  assert.equal(wrapper.children[0].style.background, undefined)
})

test('nao usa nenhum endereco da internet', () => {
  const source = readFileSync(join(root, 'MMM-AiriStage/MMM-AiriStage.js'), 'utf8')
  assert.equal(/https?:\/\/(?!localhost)/.test(source), false)
})
