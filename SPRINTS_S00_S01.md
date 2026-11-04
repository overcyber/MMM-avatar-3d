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
node --test tests/
```

Resultado nesta alteracao:

- Antes da correcao: 3 testes passaram e 9 falharam (o teste reproduz o problema).
- Depois da correcao: 12 de 12 passaram. `node --check` sem erro nos tres arquivos. As duas copias do modulo continuam identicas.

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
