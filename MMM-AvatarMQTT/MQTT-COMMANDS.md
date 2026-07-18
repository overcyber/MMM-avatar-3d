# MMM-AvatarMQTT - Guia de Comandos MQTT

## Referencia Rapida de Comandos

### Variaveis de Ambiente

```bash
BROKER="192.168.10.14"      # IP do broker MQTT
SITE_ID="magicmirror"       # Site ID do modulo
TH_URL="http://localhost:8081"  # URL do TalkingHead
```

---

## 1. TTS - Texto para Fala

### Basico
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/tts/say" \
  -m '{"text": "Ola, tudo bem?", "site_id": "$SITE_ID", "lang": "pt-br"}'
```

### Com idioma especifico
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/tts/say" \
  -m '{"text": "Hello world", "site_id": "$SITE_ID", "lang": "en-US"}'
```

### Texto longo
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/tts/say" \
  -m '{"text": "Este e um teste de texto longo para verificar a sincronizacao labial do avatar com a fala continua.", "site_id": "$SITE_ID"}'
```

---

## 2. TTS - Audio Base64 (WAV)

### Audio codificado
```bash
AUDIO_B64=$(base64 -w 0 audio.wav)
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/tts/audio" \
  -m "{\"audio\": {\"b64\": \"$AUDIO_B64\"}, \"text\": \"Texto opcional\", \"site_id\": \"$SITE_ID\"}"
```

### Via arquivo
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/tts/audio" \
  -f audio_payload.json
```

Formato do JSON:
```json
{
  "audio": {"b64": "base64_encoded_wav"},
  "text": "Texto opcional",
  "site_id": "magicmirror",
  "lang": "pt-br"
}
```

---

## 3. Controle de Fala

### Parar fala
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/tts/stop" -m '{}'
```

---

## 4. Humor (Mood)

### Happy (feliz)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/evt/mood" \
  -m '{"mood": "happy"}'
```

### Sad (triste)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/evt/mood" \
  -m '{"mood": "sad"}'
```

### Angry (raiva)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/evt/mood" \
  -m '{"mood": "angry"}'
```

### Sleep (sonolento)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/evt/mood" \
  -m '{"mood": "sleep"}'
```

### Neutral (neutro)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/evt/mood" \
  -m '{"mood": "neutral"}'
```

---

## 5. Gestos (Hand Gestures)

### Handup (mao levantada)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "handup", "duration": 3}'
```

### OK (sinal de OK)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "ok", "duration": 2}'
```

### Index (apontar)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "index", "duration": 3}'
```

### Thumbup (polegar para cima)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "thumbup", "duration": 2}'
```

### Thumbdown (polegar para baixo)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "thumbdown", "duration": 2}'
```

### Side (lado)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "side", "duration": 3}'
```

### Shrug (encolher ombros)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "shrug", "duration": 3}'
```

### Namaste (saudacao indiana)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "namaste", "duration": 3}'
```

### Com espelhamento
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "handup", "duration": 3, "mirror": true, "transition": 500}'
```

---

## 6. Emojis

### Feliz
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/emoji" \
  -m '{"emoji": "😊"}'
```

### Rindo
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/emoji" \
  -m '{"emoji": "😂"}'
```

### Triste
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/emoji" \
  -m '{"emoji": "😢"}'
```

### Raiva
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/emoji" \
  -m '{"emoji": "😠"}'
```

### Sonolento
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/emoji" \
  -m '{"emoji": "😴"}'
```

### Pensativo
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/emoji" \
  -m '{"emoji": "🤔"}'
```

---

## 7. Poses (Body Poses)

### Side (lado)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "side"}'
```

### Hip (quadril)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "hip"}'
```

### Turn (virar)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "turn"}'
```

### Bend (inclinar)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "bend"}'
```

### Back (atras)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "back"}'
```

### Straight (reto)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "straight"}'
```

### Wide (aberto)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "wide"}'
```

### Oneknee (um joelho)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "oneknee"}'
```

### Kneel (ajoelhado)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "kneel"}'
```

### Sitting (sentado)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "sitting"}'
```

---

## 8. Animacoes FBX

### Dance (danca)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/dance.fbx\", \"duration\": 10}"
```

### Walking (caminhando)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/walking.fbx\", \"duration\": 5}"
```

### Rumba Dancing
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/Rumba%20Dancing.fbx\", \"duration\": 10}"
```

### Laughing (rindo)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/Laughing.fbx\", \"duration\": 5}"
```

### Angry (raiva)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/Angry.fbx\", \"duration\": 5}"
```

### Crying (chorando)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/Crying.fbx\", \"duration\": 5}"
```

### Terrified (aterrorizado)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/Terrified.fbx\", \"duration\": 5}"
```

### Standing Idle (parado)
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/Standing%20Idle.fbx\", \"duration\": 10}"
```

### Talking animations
```bash
# Talking 0
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/Talking_0.fbx\", \"duration\": 5}"

# Talking 1
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/Talking_1.fbx\", \"duration\": 5}"

# Talking 2
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/Talking_2.fbx\", \"duration\": 5}"
```

---

## 9. Combinacoes

### Falar + Gesto
```bash
# Falar
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/tts/say" \
  -m '{"text": "Ola!", "site_id": "$SITE_ID"}'

# Gesto (logo apos)
sleep 0.5
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
  -m '{"gesture": "handup", "duration": 3}'
```

### Mudar humor + Falar
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/evt/mood" \
  -m '{"mood": "happy"}'
sleep 0.3
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/tts/say" \
  -m '{"text": "Estou muito feliz hoje!", "site_id": "$SITE_ID"}'
```

### Animacao + Pose
```bash
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/animation" \
  -m "{\"url\": \"$TH_URL/animations/dance.fbx\", \"duration\": 10}"
sleep 10
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/pose" \
  -m '{"pose": "straight"}'
```

---

## 10. Scripts Uteis

### Testar todos os gestos
```bash
for gesture in handup ok index thumbup thumbdown side shrug namaste; do
  echo "Testando gesto: $gesture"
  mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/avatar/gesture" \
    -m "{\"gesture\": \"$gesture\", \"duration\": 2}"
  sleep 3
done
```

### Testar todos os humores
```bash
for mood in happy sad angry sleep neutral; do
  echo "Testando humor: $mood"
  mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/evt/mood" \
    -m "{\"mood\": \"$mood\"}"
  sleep 3
done
```

### Monitorar todos os topicos
```bash
mosquitto_sub -h $BROKER -v -t "neoalice/v1/#"
```

### Monitorar apenas comandos
```bash
mosquitto_sub -h $BROKER -v -t "neoalice/v1/+/cmd/#"
```

---

## 11. Protocolo Hermes (Legado)

### TTS Hermes
```bash
mosquitto_pub -h $BROKER -t "hermes/tts/say" \
  -m '{"text": "Teste Hermes", "siteId": "default"}'
```

### Texto capturado
```bash
mosquitto_pub -h $BROKER -t "hermes/asr/textCaptured" \
  -m '{"text": "Texto reconhecido", "siteId": "default"}'
```

---

## 12. Troubleshooting

### Verificar conexao MQTT
```bash
mosquitto_pub -h $BROKER -t "test" -m "ping"
mosquitto_sub -h $BROKER -t "test" -C 1
```

### Ver se modulo esta escutando
```bash
mosquitto_sub -h $BROKER -v -t "neoalice/v1/$SITE_ID/#" &
mosquitto_pub -h $BROKER -t "neoalice/v1/$SITE_ID/cmd/tts/say" \
  -m '{"text": "Teste", "site_id": "$SITE_ID"}'
```

### Debug com logs
```bash
# Ativar debug no config.js
debug: true

# Ver logs
pm2 logs MagicMirror | grep MMM-AvatarMQTT
```

---

## Resumo de Topicos

| Tipo | Topico | Payload |
|------|--------|---------|
| TTS Texto | `/cmd/tts/say` | `{text, site_id?, lang?}` |
| TTS Audio | `/cmd/tts/audio` | `{audio: {b64}, text?, site_id?}` |
| Parar | `/cmd/tts/stop` | `{}` |
| Humor | `/evt/mood` | `{mood}` |
| Gesto | `/cmd/avatar/gesture` | `{gesture, duration?, mirror?, transition?}` |
| Emoji | `/cmd/avatar/emoji` | `{emoji}` |
| Pose | `/cmd/avatar/pose` | `{pose}` |
| Animacao | `/cmd/avatar/animation` | `{url, duration?}` |
| Estado | `/evt/state` | `{v, type, ts, site_id, session_id, state, user_id?}` |

---

**Nota:** Substitua `$BROKER`, `$SITE_ID`, e `$TH_URL` pelos valores do seu ambiente.
