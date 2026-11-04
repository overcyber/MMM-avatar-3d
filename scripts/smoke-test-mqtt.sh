#!/usr/bin/env bash
# Sprint S00 - teste rapido do avatar no espelho por MQTT.
# Rodar antes e depois de cada alteracao. Os comandos sao os mesmos do README.
#
# Uso:
#   MQTT_HOST=<broker> SITE=<siteId do espelho> ./scripts/smoke-test-mqtt.sh
#
# Variaveis opcionais:
#   MQTT_PORT     porta TCP do broker (padrao: 1883)
#   PAUSE         segundos entre comandos (padrao: 4)
#   ANIMATION_URL animacao FBX (padrao: ./animations/walking.fbx)
#
# Resultado automatico: o heartbeat neoalice/v1/<SITE>/evt/state precisa aparecer.
# Resultado visual: confira cada item da lista impressa no final.
set -euo pipefail

: "${MQTT_HOST:?Defina MQTT_HOST com o endereco do broker}"
SITE="${SITE:-magicmirror}"
MQTT_PORT="${MQTT_PORT:-1883}"
PAUSE="${PAUSE:-4}"
ANIMATION_URL="${ANIMATION_URL:-./animations/walking.fbx}"
BASE="neoalice/v1/${SITE}"

STATE_LOG="$(mktemp)"
trap 'rm -f "${STATE_LOG}"' EXIT

pub() {
  echo "[smoke] ${1} ${2}"
  mosquitto_pub -h "${MQTT_HOST}" -p "${MQTT_PORT}" -t "${BASE}/${1}" -m "${2}"
  sleep "${PAUSE}"
}

echo "[smoke] escutando heartbeat em ${BASE}/evt/state"
timeout 90 mosquitto_sub -h "${MQTT_HOST}" -p "${MQTT_PORT}" -C 1 -t "${BASE}/evt/state" > "${STATE_LOG}" &
SUB_PID=$!

pub "cmd/tts/say" '{"text":"Teste rapido do avatar.","lang":"pt-br"}'
for mood in neutral happy sad angry fear disgust love sleep playful reflective cozy melancholic mischief grouchy; do
  pub "cmd/evt/mood" "{\"mood\":\"${mood}\"}"
done
pub "cmd/evt/mood" '{"mood":"neutral"}'
pub "cmd/avatar/gesture" '{"gesture":"thumbup","duration":3}'
pub "cmd/avatar/pose" '{"pose":"straight"}'
pub "cmd/avatar/animation" "{\"url\":\"${ANIMATION_URL}\",\"duration\":5}"

if wait "${SUB_PID}" && [[ -s "${STATE_LOG}" ]]; then
  echo "[smoke] OK: heartbeat recebido"
  HEARTBEAT=0
else
  echo "[smoke] FALHA: nenhum heartbeat em ${BASE}/evt/state"
  HEARTBEAT=1
fi

cat <<'LIST'
[smoke] Conferencia visual (marque cada item):
  1. A Alice falou "Teste rapido do avatar."
  2. Os humores mudaram. love: suspiros e cabeca inclinada. fear: olhar amplo.
     disgust: nariz franzido. sleep: olhos fechados.
  3. playful, cozy e mischief pareceram happy. reflective pareceu neutral.
     melancholic pareceu sad. grouchy pareceu angry.
  4. O gesto thumbup apareceu e terminou.
  5. A pose straight foi aplicada.
  6. A animacao de caminhada tocou e o avatar voltou ao repouso.
LIST
exit "${HEARTBEAT}"
