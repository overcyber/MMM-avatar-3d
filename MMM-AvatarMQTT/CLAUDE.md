# MMM-AvatarMQTT - Memoria do Projeto

<!-- AUTO-MANAGED: project-description -->
Modulo MagicMirror² que exibe um avatar 3D interativo controlado via MQTT. Integrado com o ecossistema NeoAlice v1 e protocolo Hermes (Rhasspy).

Funcionalidades principais:
- Avatar 3D usando biblioteca TalkingHead com Three.js
- Controle via MQTT (texto TTS e audio base64)
- Suporte a gestos, emojis, poses e animacoes
- Sincronizacao labial (lipsync)
- Backend Node.js para processamento MQTT
- Suporte a multiplos brokers MQTT

**Dependencias principais:**
- mqtt (^5.3.5)
- TalkingHead (carregado via ES module dinamico)
- Three.js (carregado via CDN)
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: build-commands -->
**Instalacao:**
```bash
cd /mnt/dockers/MagicMirror/modules/MMM-AvatarMQTT
npm install
```

**Execucao (via MagicMirror):**
```bash
cd /mnt/dockers/MagicMirror
npm start
# Ou com PM2:
pm2 restart MagicMirror
```

**Teste MQTT:**
```bash
# Publicar mensagem de teste
mosquitto_pub -h 192.168.10.14 -t "neoalice/v1/magicmirror/cmd/tts/say" -m '{"text": "Teste", "site_id": "magicmirror"}'
```
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->
**Estrutura de diretorios:**
```
/mnt/dockers/MagicMirror/modules/MMM-AvatarMQTT/
├── MMM-AvatarMQTT.js       # Frontend do modulo (cliente)
├── node_helper.js          # Backend Node.js (servidor MQTT)
├── MMM-AvatarMQTT.css      # Estilos do modulo
├── package.json            # Dependencias NPM
├── README.md               # Documentacao de instalacao
├── CHECKLIST.md            # Checklist de desenvolvimento
├── temp/                   # Arquivos temporarios de audio
└── bkp/                    # Backups de arquivos
```

**Componentes principais:**
- **MMM-AvatarMQTT.js**: Modulo frontend MagicMirror
  - Inicializa avatar 3D via TalkingHead
  - Gerencia conexao MQTT (opcional, via frontend)
  - Processa mensagens de texto e audio
  - Controla animacoes e expressoes do avatar
- **node_helper.js**: Backend Node.js
  - Gerencia conexao MQTT (recomendado)
  - Processa audio base64
  - Publica estado do modulo (heartbeat)
  - Deduplicacao de mensagens
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->
**Padroes de codigo:**
- Idioma: Portugues (pt-br) em comentarios e logs
- Autoria: Overcyber
- Formatacao: Sem emojis em codigos ou logs (use cores para destacar)
- Logs: usar `this.log()` no frontend, `console.log()` no backend

**Nomeclatura MQTT:**
- Topicos NeoAlice v1: `neoalice/v1/{siteId}/{tipo}/{acao}`
  - Comandos TTS: `/cmd/tts/say`, `/cmd/tts/audio`, `/cmd/tts/stop`
  - Eventos STT: `/evt/stt/final`
  - Humor: `/evt/mood`
  - Avatar: `/cmd/avatar/gesture`, `/cmd/avatar/emoji`, `/cmd/avatar/pose`, `/cmd/avatar/animation`
- Topicos Hermes (legado): `hermes/tts/say`, `hermes/asr/textCaptured`, `hermes/intent/#`

**Estrutura de mensagem MQTT:**
```javascript
// Texto TTS
{
  "text": "Texto para falar",
  "site_id": "magicmirror",
  "lang": "pt-br"
}

// Audio base64
{
  "audio": { "b64": "base64_encoded_wav" },
  "text": "Texto opcional",
  "site_id": "magicmirror"
}

// Humor
{
  "mood": "happy"  // happy, sad, angry, sleep, neutral
}

// Gesto
{
  "gesture": "nod",
  "duration": 3,
  "mirror": false,
  "transition": 1000
}
```
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: patterns -->
**Carregamento de modulos ES:**
- TalkingHead carregado via importmap dinamico
- Fallback para CDN se carregamento local falhar
- URL padrao: `http://localhost:8081/modules/talkinghead.mjs`

**Inicializacao do avatar:**
1. Carregar scripts externos (Three.js, GLTFLoader)
2. Criar importmap para modulos ES
3. Importar TalkingHead dinamicamente
4. Inicializar avatar com configuracao TTS e cameraView
5. Conectar MQTT (frontend ou backend)
6. Aplicar humor inicial e exibir mensagem de boas-vindas

**Modo silencioso (useSilentMode):**
- Cria buffer de audio vazio (0.5s) para lipsync
- Distribui palavras uniformemente no tempo
- Duracao baseada no comprimento do texto (80ms por caractere)
- Usa `speakSilent(text)` em vez de `speakText()`

**Fluxo de processamento de audio:**
1. Receber mensagem MQTT com audio base64
2. Decodificar base64 para Buffer/Uint8Array
3. Converter para AudioBuffer WebAudio via `decodeAudioData()`
4. Criar objeto de audio com sincronizacao labial (words, wtimes, wdurations)
5. Reproduzir via TalkingHead.speakAudio()
6. Fallback para modo silencioso se decodificacao falhar

**Deduplicacao de mensagens MQTT (backend):**
- Janela de 1500ms (_dedupWindowMs)
- Hash SHA256 do payload (topico + mensagem)
- Limite de 200 mensagens na cache
- Chave: `${topic}:${hash}`
- Limpeza automatica de entradas expiradas

**Heartbeat de estado (evt/state):**
- Publicado periodicamente se `publishState: true`
- Intervalo configuravel via `stateHeartbeatSeconds` (padrao: 30s)
- Topico: `neoalice/v1/{siteId}/evt/state`
- Payload: `{v, type, ts, site_id, session_id, state: {value, detail}, user_id?}`
- Iniciado na primeira conexao MQTT, parado na desconexao

**Mapeamento de humor:**
- `happy|playful|excited` → `happy`
- `sad` → `sad`
- `annoyed|angry` → `angry`
- `tired|sleep` → `sleep`
- `calm|neutral` → `neutral`

**Controle de camera apos animacao:**
- Apos `playAnimation()`, ajusta `cameraView` para corrigir posicionamento
- Delay de 100-500ms para garantir que animacao iniciou
- Restaura configuracao `cameraView` (full, upper, mid, head)
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: dependencies -->
**Dependencias NPM:**
- `mqtt (^5.3.5)`: Cliente MQTT para Node.js e browser

**Dependencias externas (CDN):**
- Three.js r0.161.0: Renderizacao 3D
- GLTFLoader: Carregamento de modelos .glb
- MQTT.js: Cliente MQTT browser

**Servicos externos:**
- TalkingHead: `http://localhost:8081/modules/talkinghead.mjs`
- Modelo 3D avatar: Configuravel via `avatarURL`
- Google TTS (opcional): `https://texttospeech.googleapis.com/v1/text:synthesize`
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: git-insights -->
**Commits recentes:**
- 74afe433: Add weather modules
- 4266c0b2: Initial commit of V2

**Historico de mudancas:**
- Adicionado suporte a multiplos brokers MQTT (MQTT_BROKERS)
- Implementado controle de avatar via gestos, emojis, poses e animacoes
- Adicionado modo silencioso (useSilentMode) para lipsync sem audio
- Melhorada deduplicacao de mensagens MQTT
- Adicionado heartbeat de estado (evt/state)
<!-- END AUTO-MANAGED -->

<!-- MANUAL -->
## Contexto de Desenvolvimento

**Comandos uteis:**
- Ver logs: `tail -f /mnt/dockers/MagicMirror/modules/MMM-AvatarMQTT/nohup.out`
- Reiniciar modulo: `pm2 restart MagicMirror`
- Testar conexao MQTT: `mosquitto_sub -h 192.168.10.14 -v -t "neoalice/v1/#"`

**Configuracao atual:**
- Broker MQTT: `mqtt://192.168.10.14:1883` (backend), `ws://192.168.10.14:1884` (frontend)
- Site ID: `magicmirror`
- Avatar: `http://localhost:8081/avatars/eva2.glb`
- Linguagem: `pt-br`
- Camera: `cameraView: "full"` (opcoes: full, upper, mid, head)

**Novos topicos MQTT implementados:**
- `neoalice/v1/{siteId}/cmd/avatar/gesture` - Gestos (handup, ok, index, thumbup, thumbdown, side, shrug, namaste)
- `neoalice/v1/{siteId}/cmd/avatar/emoji` - Emojis
- `neoalice/v1/{siteId}/cmd/avatar/pose` - Poses (side, hip, turn, bend, back, straight, wide, oneknee, kneel, sitting)
- `neoalice/v1/{siteId}/cmd/avatar/animation` - Animacoes FBX

**Animacoes FBX disponiveis:**
- `poses/dance.fbx`, `animations/walking.fbx`, `animations/Rumba Dancing.fbx`
- `animations/Laughing.fbx`, `animations/Angry.fbx`, `animations/Crying.fbx`, `animations/Terrified.fbx`
- `animations/Standing Idle.fbx`, `animations/Talking_0.fbx`, `animations/Talking_1.fbx`, `animations/Talking_2.fbx`

**Problemas conhecidos:**
- Animacoes FBX podem mover o avatar - solucao: ajustar cameraView para "upper" ou "mid"
- Modelo 3D pode falhar ao carregar se URL estiver inacessivel
- AudioContext requer interacao do usuario antes de reproduzir audio
- Servidor HTTP TalkingHead deve estar rodando na porta 8081
<!-- END MANUAL -->
