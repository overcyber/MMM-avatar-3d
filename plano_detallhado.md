# Plano Detalhado - Implementacao

## Data: 2026-01-06

## Arquitetura Escolhida
- Servidor HTTP local para TalkingHead (porta 8081)
- Manter Google TTS online
- Usar avatar eva2.glb offline

## Topicos MQTT Novos
1. neoalice/v1/{siteId}/cmd/avatar/gesture
2. neoalice/v1/{siteId}/cmd/avatar/emoji
3. neoalice/v1/{siteId}/cmd/avatar/pose
4. neoalice/v1/{siteId}/cmd/avatar/animation

## Gestos Disponiveis
handup, ok, index, thumbup, thumbdown, side, shrug, namaste

## Emojis Disponiveis
😐 😶 😏 🙂 🙃 😊 😇 😀 😃 😄 😁 😆
😝 😋 😛 😜 🤪 😂 🤣 😅 😉
😭 🥺 😞 😔 😳 ☹️ 😚 😘 🥰 😍 🤩
😡 😠 🤬 😒 😱 😬 🙄 🤔 👀

## Poses Disponiveis
side, hip, turn, bend, back, straight, wide, oneknee, kneel, sitting, dance

## Animacoes Disponiveis
walking (./animations/walking.fbx)

## Arquivos a Modificar
1. /mnt/dockers/MagicMirror/modules/MMM-AvatarMQTT/MMM-AvatarMQTT.js
2. /mnt/dockers/MagicMirror/modules/MMM-AvatarMQTT/node_helper.js
3. /mnt/dockers/MagicMirror/config/config.js

## Arquivos a Criar
1. /llm/projeto/new-eva/video/TalkingHead/server.js

