# MMM-AvatarMQTT - Guia de Início Rápido

## Visão Geral

O módulo MMM-AvatarMQTT adiciona um avatar 3D animado ao seu MagicMirror que responde a comandos via MQTT. Este avatar pode falar textos enviados através do protocolo MQTT, tornando seu espelho mais interativo e pessoal.

## Instalação em 5 Minutos

### 1. Instale o Módulo

```bash
# Navegue para o diretório de módulos do MagicMirror
cd ~/MagicMirror/modules/

# Clone o repositório
git clone https://github.com/seu-usuario/MMM-AvatarMQTT.git

# Entre no diretório e instale as dependências
cd MMM-AvatarMQTT
npm install
```

### 2. Configure o módulo

Adicione o módulo à sua configuração `config.js` do MagicMirror:

```javascript
{
    module: "MMM-AvatarMQTT",
    position: "lower_third",  // Ou qualquer outra posição
    config: {
        width: "600px",
        height: "600px",
        MQTT_BROKER_WS: 'ws://seu-broker-mqtt:1884',
        debug: true  // Defina como false quando tudo estiver funcionando
    }
}
```

### 3. Configure um Broker MQTT

Se você ainda não tem um broker MQTT, instale o Mosquitto:

```bash
# No Ubuntu/Debian
sudo apt-get install mosquitto mosquitto-clients

# Configure o WebSockets editando /etc/mosquitto/mosquitto.conf
sudo nano /etc/mosquitto/mosquitto.conf
```

Adicione estas linhas ao arquivo de configuração:

```
listener 1883
listener 1884
protocol websockets
allow_anonymous true
```

Reinicie o serviço:

```bash
sudo systemctl restart mosquitto
```

### 4. Teste o módulo

Reinicie o MagicMirror:

```bash
pm2 restart MagicMirror  # Se estiver usando PM2
```

Envie uma mensagem de teste via MQTT:

```bash
mosquitto_pub -h localhost -t "hermes/tts/say" -m '{"text": "Olá, eu sou o avatar do seu espelho mágico!", "siteId": "default"}'
```

## Personalizando o Avatar

### Alterando o Modelo 3D

Você pode usar qualquer modelo 3D compatível com glTF/GLB. O ReadyPlayerMe é uma boa opção para criar avatares personalizados:

1. Visite [ReadyPlayerMe](https://readyplayer.me/) e crie seu avatar
2. Baixe o modelo em formato GLB
3. Hospede o arquivo ou use o URL direto do ReadyPlayerMe
4. Atualize a configuração:

```javascript
config: {
    avatarURL: 'https://models.readyplayer.me/seu-id-do-avatar.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png',
}
```

### Alterando o Idioma

Para usar o avatar em outros idiomas, altere a configuração:

```javascript
config: {
    language: "pt-br",  // Português do Brasil
    // Outras opções: "en", "es", "fr", etc.
}
```

## Integrando com Assistentes Virtuais

### Rhasspy

[Rhasspy](https://rhasspy.readthedocs.io/) é um assistente de voz open source que funciona bem com o MMM-AvatarMQTT.

Configure o Rhasspy para usar o mesmo broker MQTT e o avatar responderá automaticamente aos comandos de voz processados pelo Rhasspy.

### Home Assistant

Você pode integrar com o [Home Assistant](https://www.home-assistant.io/) para controlar o avatar através de automações:

1. Configure a integração MQTT no Home Assistant
2. Crie uma automação para enviar mensagens ao tópico `hermes/tts/say`

Exemplo de serviço para chamar em uma automação:

```yaml
service: mqtt.publish
data:
  topic: hermes/tts/say
  payload: '{"text": "Olá, alguém está na porta da frente!", "siteId": "default"}'
```

## Tópicos MQTT Suportados

O módulo se inscreve nos seguintes tópicos:

- `hermes/tts/say` - Para reproduzir texto falado
- `hermes/audioServer/+/playBytes/#` - Para reproduzir áudio bruto
- `hermes/audioServer/+/playWav/#` - Para reproduzir arquivos WAV
- `hermes/asr/textCaptured` - Para exibir texto reconhecido
- `hermes/intent/#` - Para responder a intenções específicas

## Próximos Passos

- Consulte o README.md completo para todas as opções de configuração
- Veja o guia de solução de problemas para ajuda com problemas comuns
- Verifique o arquivo de exemplo `config.js` para uma configuração completa
- Customize o CSS para combinar com o tema do seu MagicMirror

## Recursos Adicionais

- [Documentação do MagicMirror](https://docs.magicmirror.builders/)
- [TalkingHead no GitHub](https://github.com/met4citizen/TalkingHead)
- [Protocolo Hermes MQTT](https://docs.snips.ai/reference/hermes)
