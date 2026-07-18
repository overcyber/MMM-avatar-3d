# MMM-AvatarMQTT

Um modulo MagicMirror que exibe um avatar 3D interativo controlado via MQTT, com suporte a sincronizacao labial, gestos, emojis, poses e animacoes.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)

## Caracteristicas

- Avatar 3D usando biblioteca TalkingHead com Three.js
- Controle via MQTT (texto TTS e audio base64)
- Sincronizacao labial (lipsync) precisa
- Suporte a gestos, emojis, poses e animacoes FBX
- Multiplas conexoes MQTT brokers simultaneas
- Integracao com ecossistema NeoAlice v1 e protocolo Hermes (Rhasspy)
- Modo silencioso (lipsync sem audio)
- Controle de humor (mood) dinamico
- Heartbeat de estado para registro do modulo

## Capturas de Tela

| Avatar 3D | Controle MQTT |
|-----------|---------------|
| ![Avatar](docs/avatar-example.png) | ![MQTT](docs/mqtt-example.png) |

## Requisitos

- MagicMirror v2.15.0 ou superior
- Node.js v14 ou superior
- Servidor MQTT com suporte a WebSockets (opcional para frontend)
- Servidor HTTP TalkingHead (porta 8081) para modo offline

## Instalacao

### 1. Clone o repositorio

```bash
cd ~/MagicMirror/modules/
git clone https://github.com/overcyber/MMM-AvatarMQTT.git
cd MMM-AvatarMQTT
```

### 2. Instale as dependencias

```bash
npm install
```

### 3. Configure o modulo

Adicione ao seu `config/config.js`:

```javascript
{
    module: "MMM-AvatarMQTT",
    position: "middle_center",
    config: {
        width: "800px",
        height: "900px",
        // Broker MQTT (backend - recomendado)
        MQTT_BROKER: 'mqtt://192.168.10.14:1883',
        // Multiplos brokers (fallback)
        MQTT_BROKERS: 'mqtt://127.0.0.1:1883,mqtt://192.168.10.14:1883',
        // Site ID para filtragem
        siteId: "magicmirror",
        acceptAnySite: false,
        moodTopic: "neoalice/v1/+/evt/mood",
        // Avatar offline (TalkingHead local)
        avatarURL: 'http://localhost:8081/avatars/eva2.glb',
        cameraView: "full",
        language: "pt-br",
        debug: true,
        useGoogleTTS: true,
        googleTTSApiKey: "sua-chave-api",
        publishState: true,
        stateHeartbeatSeconds: 30
    }
}
```

### 4. Reinicie o MagicMirror

```bash
pm2 restart MagicMirror
```

## Configuracao

### Opcoes de Configuracao

| Opcao | Padrao | Descricao |
|-------|--------|-----------|
| `width` | "600px" | Largura do container do avatar |
| `height` | "600px" | Altura do container do avatar |
| `MQTT_BROKER` | 'mqtt://127.0.0.1:1883' | URL do broker MQTT (backend) |
| `MQTT_BROKERS` | null | Multiplos brokers separados por virgula |
| `MQTT_BROKER_WS` | null | URL WebSocket MQTT (frontend) |
| `siteId` | "" | ID do site para filtragem de mensagens |
| `acceptAnySite` | true | Aceita mensagens de qualquer site_id |
| `avatarURL` | URL online | URL do modelo 3D do avatar (.glb) |
| `cameraView` | "full" | Visao da camera: full, upper, mid, head |
| `language` | "pt-br" | Idioma para lipsync e TTS |
| `debug` | false | Ativa logs de debug |
| `useGoogleTTS` | true | Usa Google TTS para sintese de voz |
| `googleTTSApiKey` | "" | Chave API do Google Cloud |
| `useSilentMode` | false | Apenas lipsync sem audio |
| `moodTopic` | "neoalice/v1/+/evt/mood" | Topico MQTT para humor |
| `publishState` | true | Publica heartbeat evt/state |
| `stateHeartbeatSeconds` | 30 | Intervalo do heartbeat (segundos) |

### Visao de Camera

| Valor | Descricao |
|-------|-----------|
| `full` | Corpo completo (do pe ao topo da cabeca) |
| `upper` | Parte superior (da cintura para cima) |
| `mid` | Meio corpo (dos quadris para cima) |
| `head` | Primeiro plano (rosto e cabeca) |

## Topicos MQTT

### Protocolo NeoAlice v1

#### Texto TTS
```bash
mosquitto_pub -h localhost -t "neoalice/v1/magicmirror/cmd/tts/say" \
  -m '{"text": "Ola, tudo bem?", "site_id": "magicmirror", "lang": "pt-br"}'
```

#### Audio Base64 (WAV)
```bash
mosquitto_pub -h localhost -t "neoalice/v1/magicmirror/cmd/tts/audio" \
  -m '{"audio": {"b64": "base64_encoded_wav"}, "text": "Texto opcional", "site_id": "magicmirror"}'
```

#### Parar Fala
```bash
mosquitto_pub -h localhost -t "neoalice/v1/magicmirror/cmd/tts/stop" \
  -m '{}'
```

#### Humor
```bash
mosquitto_pub -h localhost -t "neoalice/v1/magicmirror/evt/mood" \
  -m '{"mood": "happy"}'
```

Valores disponiveis: `happy`, `sad`, `angry`, `sleep`, `neutral`

#### Gestos
```bash
mosquitto_pub -h localhost -t "neoalice/v1/magicmirror/cmd/avatar/gesture" \
  -m '{"gesture": "handup", "duration": 3}'
```

Gestos disponiveis: `handup`, `ok`, `index`, `thumbup`, `thumbdown`, `side`, `shrug`, `namaste`

#### Emojis
```bash
mosquitto_pub -h localhost -t "neoalice/v1/magicmirror/cmd/avatar/emoji" \
  -m '{"emoji": "😊"}'
```

#### Poses
```bash
mosquitto_pub -h localhost -t "neoalice/v1/magicmirror/cmd/avatar/pose" \
  -m '{"pose": "side"}'
```

Poses disponiveis: `side`, `hip`, `turn`, `bend`, `back`, `straight`, `wide`, `oneknee`, `kneel`, `sitting`

#### Animacoes
```bash
mosquitto_pub -h localhost -t "neoalice/v1/magicmirror/cmd/avatar/animation" \
  -m '{"url": "http://localhost:8081/animations/Rumba%20Dancing.fbx", "duration": 10}'
```

Animacoes disponiveis: `dance.fbx`, `walking.fbx`, `Rumba Dancing.fbx`, `Laughing.fbx`, `Angry.fbx`, `Crying.fbx`, `Terrified.fbx`, `Standing Idle.fbx`, `Talking_0.fbx`, `Talking_1.fbx`, `Talking_2.fbx`

### Protocolo Hermes (Legado)

O modulo tambem e compativel com o protocolo Hermes usado pelo Rhasspy:

- `hermes/tts/say` - Texto para fala
- `hermes/asr/textCaptured` - Texto reconhecido
- `hermes/intent/#` - Intencoes

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         MagicMirror                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐         ┌──────────────────────┐     │
│  │  MMM-AvatarMQTT.js   │◄────────┤    node_helper.js     │     │
│  │  (Frontend)          │ Socket  │  (Backend MQTT)       │     │
│  │                      │         │                      │     │
│  │  - TalkingHead 3D    │         │  - MQTT Clients      │     │
│  │  - Three.js          │         │  - Audio Processing  │     │
│  │  - Lipsync           │         │  - Deduplication     │     │
│  └──────────────────────┘         └──────────┬───────────┘     │
│                                              │                  │
├──────────────────────────────────────────────┼──────────────────┤
│                                              │                  │
│                                    ┌─────────▼──────────┐       │
│                                    │   MQTT Broker      │       │
│                                    │  (Mosquitto)       │       │
│                                    └─────────┬──────────┘       │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
┌──────────────────────────────────────────────┼──────────────────┐
│                                              │                  │
│  ┌──────────────────────┐   ┌───────────────▼──────────┐        │
│  │   TalkingHead Server │   │   NeoAlice v1           │        │
│  │   (Porta 8081)       │   │   - TTS                 │        │
│  │                      │   │   - STT                 │        │
│  │  - talkinghead.mjs   │   │   - NLU                 │        │
│  │  - avatars/          │   │   - Skills              │        │
│  │  - animations/       │   │                         │        │
│  └──────────────────────┘   └────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Modo Offline

O modulo suporta operacao totalmente offline usando o servidor HTTP TalkingHead:

### Setup do Servidor TalkingHead

```bash
cd /opt/talkinghead
docker-compose up -d
```

O servidor ira servir:
- `http://localhost:8081/modules/talkinghead.mjs` - Modulo ES principal
- `http://localhost:8081/avatars/*.glb` - Modelos 3D
- `http://localhost:8081/animations/*.fbx` - Animacoes FBX

### Docker Multi-Arch

```bash
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t talkinghead:latest .
```

Veja [README-Docker.md](README-Docker.md) para instrucoes completas.

## Solucao de Problemas

### Avatar nao aparece

1. Verifique o console do navegador (F12) para erros
2. Ative `debug: true` na configuracao
3. Verifique se a URL do avatar esta acessivel
4. Confirme que WebGL esta habilitado no navegador

### MQTT nao conecta

1. Verifique se o broker esta rodando:
   ```bash
   systemctl status mosquitto
   ```

2. Teste com mosquitto_pub:
   ```bash
   mosquitto_pub -h localhost -t "test" -m "hello"
   ```

3. Verifique as credenciais (mqttUser, mqttPassword)

### Animacoes cortam o avatar

Algumas animacoes FBX movem o avatar fora da camera. Solucoes:
- Ajuste `cameraView` para "upper" ou "mid"
- O modulo tenta restaurar a camera automaticamente apos animacoes

### Audio nao toca

1. Verifique se o AudioContext foi iniciado (requer interacao do usuario)
2. Confirme que o navegador nao esta bloqueando autoplay
3. Use `useSilentMode: true` para testar apenas lipsync

## Desenvolvimento

### Estrutura de Arquivos

```
MMM-AvatarMQTT/
├── MMM-AvatarMQTT.js       # Frontend do modulo
├── node_helper.js          # Backend Node.js
├── MMM-AvatarMQTT.css      # Estilos
├── package.json            # Dependencias
├── README.md               # Esta arquivo
├── DOCS.md                 # Documentacao detalhada
├── README-Docker.md        # Guia Docker
└── temp/                   # Arquivos temporarios
```

### Logs

```bash
# MagicMirror logs
pm2 logs MagicMirror

# Modulo especifico
tail -f ~/MagicMirror/modules/MMM-AvatarMQTT/temp/*.log
```

## Contribuicao

Contribuicoes sao bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudancas (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## Licenca

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Autor

**Overcyber**

## Agradecimentos

- [TalkingHead](https://github.com/met4citizen/TalkingHead) - Biblioteca de avatar 3D
- [MagicMirror2](https://github.com/MichMich/MagicMirror) - Framework de espelho inteligente
- [NeoAlice v1](https://github.com/overcyber/neoalice) - Ecossistema de assistente virtual

## Links

- [Documentacao Detalhada](DOCS.md)
- [Guia Docker](README-Docker.md)
- [Issue Tracker](https://github.com/overcyber/MMM-AvatarMQTT/issues)
