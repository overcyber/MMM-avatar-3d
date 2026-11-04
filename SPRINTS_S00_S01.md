# Sprints S00 e S01 - backup, teste rapido e correcao do mapeamento de humor

Roteiro completo: `docs/alice-motion-engine/PLANEJAMENTO_03_ANALISE_E_ROADMAP_DE_SPRINTS.md` no repositorio `overcyber/airi`.

## S00 - backup e teste rapido

Arquivos novos:

| Arquivo | Funcao |
| --- | --- |
| `scripts/backup-producao.sh` | Copia `config.js` e o modulo instalado (sem `node_modules`), a configuracao do Mosquitto, cria uma tag da imagem Docker do TalkingHead e grava o trafego MQTT de referencia. Gera `SHA256SUMS`. |
| `scripts/smoke-test-mqtt.sh` | Envia fala, os 14 humores da NeoAlice, os humores nativos do TalkingHead, um gesto, uma pose e uma animacao. Falha se o heartbeat `evt/state` nao aparecer. Imprime a conferencia visual. |

Uso:

```bash
MM_DIR=<pasta do MagicMirror> MQTT_HOST=<broker> MOSQUITTO_CONF=<mosquitto.conf> ./scripts/backup-producao.sh S00
```

```bash
MQTT_HOST=<broker> SITE=magicmirror ./scripts/smoke-test-mqtt.sh
```

## S01 - correcao do mapMood

### Problema

`mapMood` conhecia 10 nomes. A NeoAlice publica 14 estados do `MoodProfile`. O TalkingHead aceita 8 humores. Por isso:

- `love`, `fear` e `disgust` viravam `neutral`, apesar de o TalkingHead suportar os tres.
- `reflective`, `cozy`, `melancholic`, `mischief` e `grouchy` viravam `neutral`.
- `" Love "` (com espaco ou maiuscula) virava `neutral`.
- `constructor` ou `toString` devolviam uma funcao do prototipo para `setMood`.

### Correcao

A funcao `mapMood` foi corrigida nos tres arquivos que a tem:

- `MMM-AvatarMQTT/MMM-AvatarMQTT.js`
- `modulo-mmm-avatarmqtt/MMM-AvatarMQTT.js` (copia identica)
- `js/avatar-controller.js` (pagina independente)

A tabela e a mesma do servico `alice-companion` (`services/alice-companion/src/mood-vocabulary.ts` no `overcyber/airi`). Mude nos dois lugares.

| NeoAlice | TalkingHead |
| --- | --- |
| happy, playful, excited, cozy, mischief | happy |
| calm, neutral, reflective | neutral |
| sad, melancholic | sad |
| annoyed, angry, grouchy | angry |
| tired, sleep | sleep |
| love, fear, disgust | o mesmo nome |
| qualquer outro | neutral |

### Teste automatico

```bash
node --test tests/mood-map.test.mjs
```

Resultado nesta alteracao:

- Antes da correcao: 3 testes passaram e 9 falharam (o teste reproduz o problema).
- Depois da correcao: 12 de 12 passaram. `node --check` sem erro nos tres arquivos. As duas copias do modulo continuam identicas.

### Validacao no navegador com o TalkingHead real (04/11/2026)

Ambiente: container de teste, Chromium sem interface (renderizacao por software), servidor `server.cjs` do `talkinghead-neoalice`, avatar `eva-ruiva-arkit.glb`, Three.js 0.161.0 (a mesma versao da producao), MQTT.js e Mosquitto local com WebSocket. Os humores foram enviados por MQTT em `neoalice/v1/view/evt/mood`, no formato `v: 1` da NeoAlice. O teste le `head.moodName` dentro do TalkingHead.

| Humor enviado | Antes (commit 245cfcc) | Depois (commit 85c7807) |
| --- | --- | --- |
| happy, playful, excited | happy | happy |
| calm, neutral, reflective | neutral | neutral |
| cozy, mischief | **neutral** | happy |
| tired, sleep | sleep | sleep |
| annoyed, angry | angry | angry |
| grouchy | **neutral** | angry |
| sad | sad | sad |
| melancholic | **neutral** | sad |
| love | **neutral** | love |
| fear | **neutral** | fear |
| disgust | **neutral** | disgust |
| `" Love "` | **neutral** | love |
| `constructor` | **controlador em estado invalido** | neutral |

- Antes: 9 de 20 casos errados. Depois: 20 de 20 corretos.
- Gesto `thumbup` e animacao `walking.fbx` funcionaram antes e depois.
- Evidencias em `evidencias/S01/`: comparacoes lado a lado (`comparacao-love.png`, `comparacao-fear.png`, `comparacao-disgust.png`), capturas depois da correcao e os resultados em JSON.

O teste no navegador usa a pagina independente (`index.html` e `js/`). O modulo do MagicMirror tem o mesmo `mapMood`, verificado pelo teste `tests/mood-map.test.mjs`. O modulo completo so roda dentro do MagicMirror.

Para repetir:

```bash
mkdir -p <pasta de teste>/deps && cd <pasta de teste>/deps && npm init -y && npm install three@0.161.0 mqtt@5
```

```bash
node scripts/teste-navegador-s01.cjs <pasta de teste> depois http://127.0.0.1:8082
```

Antes, suba o `server.cjs` do `talkinghead-neoalice` na porta 8081, a pagina na porta 8082 (`python3 -m http.server 8082`) e um Mosquitto com TCP 18830 e WebSocket 18831.

### Defeito encontrado durante o teste (fora da S01)

`modules/lipsync-pt-br.mjs` e `modules/lipsync-pt.mjs` do `talkinghead-neoalice` sao copias identicas de `lipsync-en.mjs` (mesmo MD5) e exportam a classe `LipsyncEn`. O TalkingHead procura outra classe para esses idiomas e o carregamento falha com `module[className] is not a constructor`, antes e depois da S01. No repositorio, nao existe lip-sync em portugues.

A copia em producao pode ser diferente. Conferir o arquivo no servidor antes de concluir. O registro e a sprint de correcao estao no Planejamento 03 do `overcyber/airi` (item L12).

### Implantacao no espelho (passo a passo)

1. Backup:

   ```bash
   MM_DIR=<pasta do MagicMirror> MQTT_HOST=<broker> ./scripts/backup-producao.sh S01
   ```

2. Teste antes. Guarde a saida e a conferencia visual:

   ```bash
   MQTT_HOST=<broker> SITE=magicmirror ./scripts/smoke-test-mqtt.sh | tee smoke-antes-S01.log
   ```

3. Alteracao: copie o modulo corrigido para o MagicMirror:

   ```bash
   cp MMM-AvatarMQTT/MMM-AvatarMQTT.js <pasta do MagicMirror>/modules/MMM-AvatarMQTT/MMM-AvatarMQTT.js
   ```

4. Reinicie o MagicMirror (por exemplo `pm2 restart MagicMirror`).

5. Teste depois:

   ```bash
   MQTT_HOST=<broker> SITE=magicmirror ./scripts/smoke-test-mqtt.sh | tee smoke-depois-S01.log
   ```

6. Validacao:
   - `love` mostra suspiros e cabeca inclinada, `fear` mostra olhar amplo, `disgust` mostra nariz franzido.
   - Os humores que ja funcionavam continuam iguais ao `smoke-antes-S01.log`.
   - O heartbeat aparece nos dois testes.

7. Se algo falhar, restaure e reinicie:

   ```bash
   tar xzf backups/backup-S01-<data>/magicmirror.tar.gz -C <pasta do MagicMirror>
   ```

### Fora do escopo

- O arquivo `node_helper.js` nao muda. Ele so repassa o humor para o frontend.
- A pagina independente (`index.html` e `js/`) recebe a mesma correcao, mas so precisa ser copiada se estiver em uso.
