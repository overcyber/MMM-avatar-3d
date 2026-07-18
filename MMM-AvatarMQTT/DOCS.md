# MMM-AvatarMQTT - Documentacao Tecnica Completa

## Sumario

1. [Visao Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. [Instalacao Detalhada](#instalacao-detalhada)
4. [Configuracao Avancada](#configuracao-avancada)
5. [Protocolo MQTT NeoAlice v1](#protocolo-mqtt-neoalice-v1)
6. [Integracao com TalkingHead](#integracao-com-talkinghead)
7. [API de Notificacoes](#api-de-notificacoes)
8. [Solucao de Problemas Avancada](#solucao-de-problemas-avancada)
9. [Desenvolvimento e Extensao](#desenvolvimento-e-extensao)

---

## Visao Geral

O MMM-AvatarMQTT e um modulo para MagicMirror2 que exibe um avatar 3D controlado via MQTT. Ele integra:

- **TalkingHead**: Biblioteca de avatar 3D com lipsync
- **Three.js**: Renderizacao 3D no navegador
- **MQTT**: Protocolo de mensageria para controle remoto
- **NeoAlice v1**: Ecossistema de assistente virtual

### Funcionalidades Principais

| Funcionalidade | Descricao |
|----------------|-----------|
| TTS | Texto para fala com sincronizacao labial |
| Audio Base64 | Reproducao de audio WAV codificado em base64 |
| Gestos | Animacoes de maos pre-definidas |
| Emojis | Exibicao de emojis animados no rosto |
| Poses | Posicionamentos do corpo |
| Animacoes FBX | Animacoes completas do corpo |
| Mood | Controle de expressao facial |
| Lipsync | Sincronizacao labial precisa |

---

## Arquitetura

### Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MagicMirror Process                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────┐      ┌──────────────────────────┐  │
│  │       MMM-AvatarMQTT.js            │      │     node_helper.js       │  │
│  │       (Frontend Browser)           │      │     (Backend Node.js)    │  │
│  │                                    │      │                          │  │
│  │  ┌──────────────────────────────┐ │      │  ┌────────────────────┐  │  │
│  │  │    TalkingHead Class         │ │      │  │  MQTT Clients      │  │  │
│  │  │    - showAvatar()            │ │      │  │  - Connect         │  │  │
│  │  │    - speakText()             │ │      │  │  - Subscribe       │  │  │
│  │  │    - speakAudio()            │ │      │  │  - Publish         │  │  │
│  │  │    - playGesture()           │ │      │  │  - Multi-broker    │  │  │
│  │  │    - playAnimation()         │ │      │  └────────────────────┘  │  │
│  │  │    - setMood()               │ │      │                          │  │
│  │  │    - setView()               │ │      │  ┌────────────────────┐  │  │
│  │  └──────────────────────────────┘ │      │  │  Audio Processor   │  │  │
│  │                                    │      │  │  - Base64 decode   │  │  │
│  │  ┌──────────────────────────────┐ │      │  │  - AudioBuffer     │  │  │
│  │  │    MQTT Frontend (opcional)  │ │      │  └────────────────────┘  │  │
│  │  │    - mqtt.connect()          │ │      │                          │  │
│  │  └──────────────────────────────┘ │      │  ┌────────────────────┐  │  │
│  │                                    │      │  │  Deduplication     │  │  │
│  │  ┌──────────────────────────────┐ │      │  │  - SHA256 hash     │  │  │
│  │  │    Socket Notifications      │ │      │  │  - 1500ms window    │  │  │
│  │  └──────────────────────────────┘ │      │  └────────────────────┘  │  │
│  └─────────────────────────────────────┘      └──────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Socket.io
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MQTT Broker                                     │
│                           (Mosquitto/EMQX)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │  TTS      │   │  STT      │   │  NLU      │
            │  Service  │   │  Service  │   │  Engine   │
            └───────────┘   └───────────┘   └───────────┘
```

### Fluxo de Mensagens

#### TTS (Texto para Fala)
```
1. NeoAlice TTS publica: neoalice/v1/{siteId}/cmd/tts/say
2. node_helper recebe e envia via Socket.io
3. MMM-AvatarMQTT.js processa
4. TalkingHead.speakText() é chamado
5. Google TTS gera audio
6. AudioContext reproduz
7. Lipsync sincronizado com o audio
```

#### Audio Base64
```
1. Servidor TTS publica: neoalice/v1/{siteId}/cmd/tts/audio
2. node_helper decodifica base64 para Buffer
3. Buffer enviado via Socket.io
4. Frontend decodifica para AudioBuffer
5. TalkingHead.speakAudio() reproduz
6. Lipsync com palavras sincronizadas
```

#### Gestos/Animacoes
```
1. Cliente MQTT publica: neoalice/v1/{siteId}/cmd/avatar/gesture
2. node_helper roteia para frontend
3. TalkingHead.playGesture() executa
4. Animacao renderizada no canvas Three.js
```

---

## Instalacao Detalhada

### Pre-requisitos do Sistema

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm nodejs-legacy mosquitto-clients

# Verificar versoes
node --version  # >= 14.0.0
npm --version   # >= 6.0.0
```

### Instalacao do Modulo

```bash
# Navegar para modules do MagicMirror
cd ~/MagicMirror/modules/

# Clonar repositorio
git clone https://github.com/overcyber/MMM-AvatarMQTT.git

# Entrar no diretorio
cd MMM-AvatarMQTT

# Instalar dependencias
npm install

# Verificar instalacao
ls node_modules/mqtt
```

### Configuracao do Broker MQTT

#### Mosquitto

```bash
# /etc/mosquitto/mosquitto.conf
listener 1883
listener 1884
protocol websockets
allow_anonymous true

# Persistencia
persistence true
persistence_location /var/lib/mosquitto/

# Logs
log_dest file /var/log/mosquitto/mosquitto.log
```

```bash
# Reiniciar mosquitto
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto

# Testar
mosquitto_sub -h localhost -v -t "test"
mosquitto_pub -h localhost -t "test" -m "hello"
```

---

## Configuracao Avancada

### Opcoes Completas de Configuracao

```javascript
{
    module: "MMM-AvatarMQTT",
    position: "middle_center",
    config: {
        // Dimensoes
        width: "800px",
        height: "900px",

        // MQTT Backend (recomendado)
        MQTT_BROKER: 'mqtt://192.168.10.14:1883',
        MQTT_BROKERS: 'mqtt://127.0.0.1:1883,mqtt://192.168.10.14:1883',

        // MQTT Frontend (opcional)
        MQTT_BROKER_WS: 'ws://192.168.10.14:1884',
        MQTT_CLIENT_ID: "EVA_MQTT_" + Date.now(),

        // Credenciais MQTT
        mqttUser: "",
        mqttPassword: "",

        // Site ID e filtragem
        siteId: "magicmirror",
        acceptAnySite: false,

        // Avatar
        avatarURL: 'http://localhost:8081/avatars/eva2.glb',
        cameraView: "full",  // full, upper, mid, head

        // Idioma
        language: "pt-br",

        // Debug
        debug: true,
        welcomeMessage: "Ola, estou pronta!",

        // Reconexao
        reconnectInterval: 5000,
        maxReconnectAttempts: 10,

        // Modo de operacao
        useMQTTBackend: true,  // true = backend, false = frontend

        // Topicos
        moodTopic: "neoalice/v1/+/evt/mood",

        // Heartbeat de estado
        publishState: true,
        stateHeartbeatSeconds: 30,
        stateValue: "idle",
        stateDetail: "hb",
        stateUserId: "",

        // TTS
        useGoogleTTS: true,
        googleTTSEndpoint: "https://texttospeech.googleapis.com/v1/text:synthesize",
        googleTTSApiKey: "SUA_CHAVE_API",

        // Modo silencioso
        useSilentMode: false
    }
}
```

### Multiplas Instancias

```javascript
// Primeira instancia - Avatar principal
{
    module: "MMM-AvatarMQTT",
    position: "top_left",
    config: {
        siteId: "avatar1",
        avatarURL: 'http://localhost:8081/avatars/eva.glb',
        // ...
    }
},

// Segunda instancia - Avatar secundario
{
    module: "MMM-AvatarMQTT",
    position: "top_right",
    config: {
        siteId: "avatar2",
        avatarURL: 'http://localhost:8081/avatars/robot.glb',
        // ...
    }
}
```

---

## Protocolo MQTT NeoAlice v1

### Estrutura de Topicos

```
neoalice/v1/{siteId}/{tipo}/{acao}

├── cmd/          (Comandos)
│   ├── tts/
│   │   ├── say       (Texto para fala)
│   │   ├── audio     (Audio base64)
│   │   └── stop      (Parar fala)
│   └── avatar/
│       ├── gesture   (Gestos de maos)
│       ├── emoji     (Emojis faciais)
│       ├── pose      (Poses do corpo)
│       └── animation (Animacoes FBX)
└── evt/          (Eventos)
    ├── stt/
    │   └── final     (Texto reconhecido)
    └── mood          (Mudanca de humor)
```

### Payloads MQTT

#### TTS Say
```json
{
  "text": "Texto para falar",
  "site_id": "magicmirror",
  "lang": "pt-br",
  "volume": 1.0,
  "rate": 1.0
}
```

#### TTS Audio
```json
{
  "audio": {
    "b64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA..."
  },
  "text": "Texto opcional para exibicao",
  "site_id": "magicmirror",
  "lang": "pt-br"
}
```

#### Gesture
```json
{
  "gesture": "handup|ok|index|thumbup|thumbdown|side|shrug|namaste",
  "duration": 3,
  "mirror": false,
  "transition": 1000
}
```

#### Emoji
```json
{
  "emoji": "😊|😂|😢|😠|😴|🤔"
}
```

#### Pose
```json
{
  "pose": "side|hip|turn|bend|back|straight|wide|oneknee|kneel|sitting"
}
```

#### Animation
```json
{
  "url": "http://localhost:8081/animations/Rumba%20Dancing.fbx",
  "duration": 10
}
```

#### Mood
```json
{
  "mood": "happy|sad|angry|sleep|neutral"
}
```

#### State (Heartbeat)
```json
{
  "v": 1,
  "type": "avatar",
  "ts": 1704624000000,
  "site_id": "magicmirror",
  "session_id": "session-uuid",
  "state": {
    "value": "idle",
    "detail": "hb"
  },
  "user_id": "user-uuid-optional"
}
```

---

## Integracao com TalkingHead

### Setup do Servidor HTTP TalkingHead

O servidor HTTP TalkingHead serve os arquivos necessarios para operacao offline:

```bash
# Build da imagem Docker
cd /opt/talkinghead
docker build -t talkinghead:latest .

# Subir container
docker-compose up -d

# Verificar
curl http://localhost:8081/modules/talkinghead.mjs
```

### ImportMap

O modulo usa importMap para carregar o TalkingHead:

```javascript
const importMap = document.createElement('script');
importMap.type = 'importmap';
importMap.textContent = JSON.stringify({
    imports: {
        "three": "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/",
        "talkinghead": "http://localhost:8081/modules/talkinghead.mjs"
    }
});
document.head.appendChild(importMap);
```

### Metodos TalkingHead Utilizados

| Metodo | Parametros | Descricao |
|--------|-----------|-----------|
| `showAvatar()` | config, progress | Carrega modelo 3D do avatar |
| `speakText()` | text, options | Fala texto com TTS + lipsync |
| `speakAudio()` | audioData, options | Reproduz audio com lipsync |
| `speakSilent()` | text | Lipsync sem audio (modo silencioso) |
| `playGesture()` | name, duration, mirror, transition | Executa gesto de mao |
| `speakEmoji()` | emoji | Exibe emoji facial |
| `setPoseFromTemplate()` | pose | Define pose do corpo |
| `playAnimation()` | url, onEnded, duration | Reproduz animacao FBX |
| `setMood()` | mood | Define humor/expressao |
| `setView()` | view, options | Ajusta camera |

---

## API de Notificacoes

### Notificacoes Recebidas (de outros modulos)

```javascript
// Fazer o avatar falar
MM.sendNotification("AVATAR_SPEAK", "Ola mundo!");

MM.sendNotification("AVATAR_SPEAK", {
    text: "Ola mundo!",
    options: { siteId: "default" }
});
```

### Notificacoes Enviadas (para outros modulos)

O modulo envia notificacoes quando eventos ocorrem:

```javascript
// Avatar carregado
"AVATAR_LOADED"

// MQTT conectado/desconectado
"MQTT_STATUS", { connected: true }

// Texto reconhecido
"TEXT_RECOGNIZED", { text: "...", siteId: "..." }
```

---

## Solucao de Problemas Avancada

### Logs de Debug

```bash
# MagicMirror completo
pm2 logs MagicMirror --lines 100

# Modulo especifico
pm2 logs MagicMirror | grep MMM-AvatarMQTT

# Console do navegador (F12)
# Buscar por: "MMM-AvatarMQTT"
```

### Problemas Conhecidos e Solucoes

#### 1. Avatar nao carrega (branco)

**Causa**: WebGL desabilitado ou URL inacessivel

**Solucao**:
```javascript
// Verificar WebGL
console.log(window.WebGLRenderingContext);

// Testar URL do avatar
fetch(config.avatarURL).then(r => console.log(r.status));

// Habilitar GPU no Electron
// Adicionar ao inicio do config.js:
process.env.ELECTRON_ENABLE_GPU = 1;
```

#### 2. Lipsync nao sincronizado

**Causa**: AudioContext nao iniciado

**Solucao**:
```javascript
// Adicionar interacao do usuario antes
document.addEventListener('click', () => {
    if (this.head && this.head.audioContext) {
        this.head.audioContext.resume();
    }
}, { once: true });
```

#### 3. Deduplicacao de mensagens

O modulo usa janela de 1500ms para deduplicar mensagens MQTT:

```javascript
// node_helper.js
this._dedupWindowMs = 1500;
this._msgDedup = new Map();

// Hash SHA256 do payload
const hash = crypto.createHash('sha256')
    .update(topic + JSON.stringify(data))
    .digest('hex');
```

---

## Desenvolvimento e Extensao

### Adicionar Novos Gestos

1. Adicione o gesto ao TalkingHead:
```javascript
// No arquivo de gestos do TalkingHead
handup: { ... }
```

2. Use via MQTT:
```bash
mosquitto_pub -t "neoalice/v1/magicmirror/cmd/avatar/gesture" \
  -m '{"gesture": "meu_novo_gesto"}'
```

### Adicionar Novas Animacoes

1. Copie arquivo .fbx para animations/
2. Referencie via URL:
```bash
mosquitto_pub -t "neoalice/v1/magicmirror/cmd/avatar/animation" \
  -m '{"url": "http://localhost:8081/animations/minha_animacao.fbx"}'
```

### Estender com Novos Topicos MQTT

1. Adicione topico em node_helper.js:
```javascript
topics.push('neoalice/v1/+/cmd/meu_novo_topico');
```

2. Adicione handler:
```javascript
if (topic.endsWith('/cmd/meu_novo_topico')) {
    self.sendSocketNotification("MEU_NOVO_TOPOCO", data);
}
```

3. Adicione handler no frontend:
```javascript
case "MEU_NOVO_TOPOCO":
    // Processa payload
    break;
```

---

## Referencias

- [MagicMirror2 Documentation](https://docs.magicmirror.builders/)
- [TalkingHead GitHub](https://github.com/met4citizen/TalkingHead)
- [MQTT Protocol](https://mqtt.org/)
- [NeoAlice v1](https://github.com/overcyber/neoalice)
- [Three.js](https://threejs.org/)

---

## Licenca

MIT License - Copyright (c) 2024 Overcyber
