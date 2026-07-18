# Decisoes do Usuario

## Data: 2026-01-06

## Escolhas Feitas

### 1. Arquitetura do TalkingHead
**Opcao escolhida: Servidor HTTP local**
- Rodar TalkingHead como servidor HTTP separado (porta 8081)
- MagicMirror consome via fetch/requests
- Permite manter TalkingHead independente e atualizavel

### 2. TTS Offline
**Opcao escolhida: Manter Google TTS**
- Nao sera alterado o sistema TTS
- Continuara usando Google Cloud TTS online
- Apenas o avatar sera offline

### 3. Modelo 3D
**Opcao escolhida: Usar eva2.glb do TalkingHead**
- Avatar localizado em: /llm/projeto/new-eva/video/TalkingHead/avatars/eva2.glb
- Deve ser configurado com URL local do servidor

## Topicos MQTT a Adicionar

### Alem do topico de humor ja existente:
1. **neoalice/v1/{siteId}/cmd/avatar/gesture** - Gestos (handup, thumbup, etc)
2. **neoalice/v1/{siteId}/cmd/avatar/emoji** - Emoticons animados
3. **neoalice/v1/{siteId}/cmd/avatar/pose** - Poses corporais
4. **neoalice/v1/{siteId}/cmd/avatar/animation** - Animacoes FBX

