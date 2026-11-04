#!/usr/bin/env bash
# Sprint S00 - backup do sistema do avatar antes de qualquer alteracao.
# Cria uma pasta datada com: configuracao e modulo do MagicMirror, configuracao do
# Mosquitto, tag da imagem Docker do TalkingHead e 5 minutos de trafego MQTT de referencia.
#
# Uso:
#   MM_DIR=<pasta do MagicMirror> MQTT_HOST=<broker> ./scripts/backup-producao.sh <ID da sprint>
#
# Variaveis opcionais:
#   MOSQUITTO_CONF   arquivo de configuracao do Mosquitto a copiar
#   TH_IMAGE         imagem Docker do TalkingHead (padrao: talkinghead:latest)
#   MQTT_PORT        porta TCP do broker (padrao: 1883)
#   RECORD_SECONDS   duracao da gravacao MQTT (padrao: 300; 0 desliga)
#   BACKUP_ROOT      pasta onde criar o backup (padrao: ./backups)
set -euo pipefail

SPRINT_ID="${1:?Informe o ID da sprint, por exemplo S01}"
: "${MM_DIR:?Defina MM_DIR com a pasta do MagicMirror}"
TH_IMAGE="${TH_IMAGE:-talkinghead:latest}"
MQTT_PORT="${MQTT_PORT:-1883}"
RECORD_SECONDS="${RECORD_SECONDS:-300}"
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_ROOT}/backup-${SPRINT_ID}-${STAMP}"
mkdir -p "${DEST}"

echo "[backup] destino: ${DEST}"

echo "[backup] MagicMirror: config.js e modulo MMM-AvatarMQTT (sem node_modules)"
tar czf "${DEST}/magicmirror.tar.gz" -C "${MM_DIR}" --exclude=node_modules \
  config/config.js modules/MMM-AvatarMQTT

if [[ -n "${MOSQUITTO_CONF:-}" ]]; then
  echo "[backup] Mosquitto: ${MOSQUITTO_CONF}"
  cp -p "${MOSQUITTO_CONF}" "${DEST}/"
fi

if command -v docker >/dev/null 2>&1 && docker image inspect "${TH_IMAGE}" >/dev/null 2>&1; then
  BACKUP_TAG="${TH_IMAGE%%:*}:backup-${SPRINT_ID}-${STAMP}"
  echo "[backup] imagem Docker: ${TH_IMAGE} -> ${BACKUP_TAG}"
  docker image tag "${TH_IMAGE}" "${BACKUP_TAG}"
  echo "${BACKUP_TAG}" > "${DEST}/docker-image-tag.txt"
else
  echo "[backup] AVISO: imagem ${TH_IMAGE} nao encontrada. Tag Docker nao criada."
fi

if [[ "${RECORD_SECONDS}" -gt 0 ]]; then
  : "${MQTT_HOST:?Defina MQTT_HOST para gravar o trafego de referencia, ou use RECORD_SECONDS=0}"
  echo "[backup] gravando ${RECORD_SECONDS}s de trafego neoalice/v1/# (converse com a Alice agora)"
  timeout "${RECORD_SECONDS}" mosquitto_sub -h "${MQTT_HOST}" -p "${MQTT_PORT}" -v -t 'neoalice/v1/#' \
    > "${DEST}/mqtt-referencia.log" || true
  echo "[backup] mensagens gravadas: $(wc -l < "${DEST}/mqtt-referencia.log")"
fi

(cd "${DEST}" && sha256sum ./* > SHA256SUMS)
echo "[backup] concluido: ${DEST}"
echo "[backup] para restaurar o MagicMirror: tar xzf ${DEST}/magicmirror.tar.gz -C \"\${MM_DIR}\""
