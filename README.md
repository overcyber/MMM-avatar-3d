# Avatar 3D - Sistema Independente

Sistema independente de avatar 3D controlado via MQTT, que funciona sem MagicMirror.

## Estrutura

```
contexto/view/
├── index.html              # HTML principal
├── js/
│   ├── avatar-controller.js    # Controle do avatar
│   └── mqtt-client.js          # Cliente MQTT
├── css/
│   └── avatar.css             # Estilos
└── README.md                  # Este arquivo
```

## Requisitos

- Servidor HTTP (Python, Node.js, ou qualquer servidor web)
- Broker MQTT (Mosquitto) rodando em `192.168.10.14:1883/1884`
- Servidor TalkingHead em `http://localhost:8081` ou via CDN

## Como Usar

### 1. Iniciar o Servidor HTTP

```bash
cd /mnt/dockers/MagicMirror/contexto/view
python3 -m http.server 8082
```

### 2. Acessar no Navegador

```
http://localhost:8082
```

### 3. Enviar Comandos MQTT

**TTS Say:**
```bash
mosquitto_pub -h 192.168.10.14 -p 1883 \
  -t "neoalice/v1/view/cmd/tts/say" \
  -m '{"text": "Ola, sistema independente funcionando!", "lang": "pt-br"}'
```

**Gesture:**
```bash
mosquitto_pub -h 192.168.10.14 -p 1883 \
  -t "neoalice/v1/view/cmd/avatar/gesture" \
  -m '{"gesture": "handup", "duration": 3}'
```

**Mood:**
```bash
mosquitto_pub -h 192.168.10.14 -p 1883 \
  -t "neoalice/v1/view/evt/mood" \
  -m '{"mood": "happy"}'
```

**Emoji:**
```bash
mosquitto_pub -h 192.168.10.14 -p 1883 \
  -t "neoalice/v1/view/cmd/avatar/emoji" \
  -m '{"emoji": "😊"}'
```

**Pose:**
```bash
mosquitto_pub -h 192.168.10.14 -p 1883 \
  -t "neoalice/v1/view/cmd/avatar/pose" \
  -m '{"pose": "side"}'
```

**Animation:**
```bash
mosquitto_pub -h 192.168.10.14 -p 1883 \
  -t "neoalice/v1/view/cmd/avatar/animation" \
  -m '{"url": "http://192.168.10.14:8081/animations/Rumba%20Dancing.fbx", "duration": 10}'
```

## Comandos MQTT Suportados

### Comandos TTS

| Topico | Payload | Descricao |
|--------|---------|-----------|
| `/cmd/tts/say` | `{"text": "...", "lang": "pt-br"}` | Falar texto |
| `/cmd/tts/audio` | `{"audio": {"b64": "..."}}` | Reproduzir audio base64 |
| `/cmd/tts/stop` | `{}` | Parar fala |

### Comandos de Avatar

| Topico | Payload | Descricao |
|--------|---------|-----------|
| `/cmd/avatar/gesture` | `{"gesture": "handup", "duration": 3}` | Executar gesto |
| `/cmd/avatar/emoji` | `{"emoji": "😊"}` | Exibir emoji |
| `/cmd/avatar/pose` | `{"pose": "side"}` | Definir pose |
| `/cmd/avatar/animation` | `{"url": "...", "duration": 10}` | Reproduzir animacao |

### Eventos

| Topico | Payload | Descricao |
|--------|---------|-----------|
| `/evt/mood` | `{"mood": "happy"}` | Alterar humor |
| `/evt/stt/final` | `{"text": "..."}` | Texto reconhecido |

## Gestos Disponiveis

`handup`, `ok`, `index`, `thumbup`, `thumbdown`, `side`, `shrug`, `namaste`

## Emojis Disponiveis

`😊`, `😂`, `😢`, `😠`, `😴`, `🤔`

## Poses Disponiveis

`side`, `hip`, `turn`, `bend`, `back`, `straight`, `wide`, `oneknee`, `kneel`, `sitting`

## Humores Disponiveis

`happy`, `sad`, `angry`, `sleep`, `neutral`

## Configuracao

Para alterar a configuracao, edite o objeto `CONFIG` em `index.html`:

```javascript
const CONFIG = {
    brokerUrl: 'ws://192.168.10.14:1884',
    clientId: 'VIEW_AVATAR_' + Math.random().toString(16).substr(2, 8),
    siteId: 'view',
    avatarURL: 'https://models.readyplayer.me/...',
    cameraView: 'full',
    language: 'pt-br',
    debug: true
};
```

## Diferenca para MagicMirror

Este sistema usa **EXATAMENTE** a mesma logica e configuracao do MMM-AvatarMQTT:

- MESMO broker MQTT
- MESMOS topicos
- MESMOS payloads
- MESMO modelo 3D
- MESMA API TalkingHead
- MESMA logica de processamento

A unica diferenca e que funciona sem MagicMirror, tornando-o ideal para:
- Testes independentes
- Integracao com outros sistemas
- Desenvolvimento Android (WebView)
- Debugging

## Funcionamento sem internet

O modulo `MMM-AvatarMQTT` carrega o three.js 0.161.0 de uma copia local, em `MMM-AvatarMQTT/node_modules/three`.
O importmap do modulo redireciona para essa copia os enderecos `esm.sh` e `cdn.jsdelivr.net` que o `talkinghead.mjs` do servidor TalkingHead usa.
Os 11 arquivos que o TalkingHead usa ficam no git. O `npm install` traz o pacote completo.

| Opcao | Padrao | Uso |
| --- | --- | --- |
| `threeBaseURL` | `/modules/MMM-AvatarMQTT/node_modules/three` | Onde esta a copia local do three.js |
| `allowCdnFallback` | `false` | Usa o CDN do TalkingHead se o servidor local falhar. Precisa de internet. |
| `avatarURL` | `http://localhost:8081/avatars/eva2.glb` | Avatar do servidor TalkingHead local |

O Google TTS (`useGoogleTTS`) continua online. Sem internet, a NeoAlice precisa mandar o audio pronto em `cmd/tts/audio`, ou use `useGoogleTTS: false`.

Teste sem internet (o navegador bloqueia tudo que nao seja 127.0.0.1):

```bash
node scripts/teste-offline-modulo.cjs <pasta do servidor TalkingHead> ./saida-offline
```

## Modulo MMM-AiriStage (avatar novo)

`MMM-AiriStage/` mostra o palco do AIRI (fork `overcyber/airi`) num iframe. O AIRI roda como build offline
(`VITE_AIRI_OFFLINE=true`) num servidor estatico da propria maquina, por padrao em `http://localhost:4173/`.
A fala, o humor e os gestos chegam pela ponte NeoAlice do AIRI, que so le o MQTT.

```javascript
{
    module: "MMM-AiriStage",
    position: "fullscreen_below",
    config: { url: "http://localhost:4173/" }
}
```

Use um arquivo de configuracao separado para testar, e mantenha o `config.js` de producao como volta.
A revisao completa esta no repositorio do AIRI: `docs/alice-motion-engine/REVISAO_MAGICMIRROR_E_OFFLINE.md`.

Testes:

```bash
node --test tests/airi-stage.test.mjs
AIRI_URL=http://127.0.0.1:4173/ node scripts/teste-offline-airi-stage.cjs ./saida-airi-stage
```

## Troubleshooting

**Avatar nao carrega:**
- Verificar se o servidor TalkingHead esta rodando em `localhost:8081`
- Verificar o console do navegador para erros

**MQTT desconecta:**
- Verificar se o broker esta rodando: `sudo systemctl status mosquitto`
- Verificar conexao de rede: `ping 192.168.10.14`

**Audio nao reproduz:**
- Clicar na pagina para ativar AudioContext (requisito do navegador)
- Verificar console para erros de decodificacao

## Monitoramento

```bash
# Ver mensagens MQTT
mosquitto_sub -h 192.168.10.14 -p 1883 -v -t "neoalice/v1/view/#"

# Ver status do broker
sudo systemctl status mosquitto
```
