// MqttClient - Cliente MQTT puro JavaScript
// Conexão MQTT WebSocket (MESMA configuracao do MagicMirror)

export class MqttClient {
    constructor(config, avatarController) {
        this.config = config;
        this.avatarController = avatarController;
        this.client = null;
        this.connected = false;
    }

    connect() {
        window.log('Conectando ao broker MQTT: ' + this.config.brokerUrl);

        // MESMA configuracao do MagicMirror - MMM-AvatarMQTT.js linha 416-427
        const mqttOptions = {
            clientId: this.config.clientId,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 10000
        };

        try {
            this.client = mqtt.connect(this.config.brokerUrl, mqttOptions);

            this.client.on('connect', () => {
                this.connected = true;
                window.log('MQTT Conectado!');
                this.avatarController.updateStatus('mqtt', 'connected', 'MQTT: Conectado');
                this.subscribeTopics();
            });

            this.client.on('reconnect', () => {
                window.log('Tentando reconectar ao broker MQTT...');
            });

            this.client.on('offline', () => {
                this.connected = false;
                window.log('MQTT Desconectado');
                this.avatarController.updateStatus('mqtt', 'disconnected', 'MQTT: Desconectado');
            });

            this.client.on('error', (err) => {
                window.log('ERRO MQTT: ' + err);
                this.connected = false;
                this.avatarController.updateStatus('mqtt', 'disconnected', 'MQTT: Erro');
            });

            this.client.on('message', (topic, message) => {
                this.handleMessage(topic, message);
            });

        } catch (e) {
            window.log('Erro ao iniciar MQTT: ' + e);
        }
    }

    subscribeTopics() {
        // MESMOS topicos do MagicMirror - MMM-AvatarMQTT.js linha 438-454
        const topics = [
            'neoalice/v1/+/cmd/tts/say',
            'neoalice/v1/+/cmd/tts/audio',
            'neoalice/v1/+/cmd/tts/stop',
            'neoalice/v1/+/evt/stt/final',
            'neoalice/v1/+/evt/mood',
            'neoalice/v1/+/cmd/avatar/gesture',
            'neoalice/v1/+/cmd/avatar/emoji',
            'neoalice/v1/+/cmd/avatar/pose',
            'neoalice/v1/+/cmd/avatar/animation',
            'hermes/#'
        ];

        topics.forEach(topic => {
            this.client.subscribe(topic, (err) => {
                if (!err) {
                    window.log('Inscrito em: ' + topic);
                } else {
                    window.log('ERRO ao inscrever em: ' + topic);
                }
            });
        });
    }

    handleMessage(topic, message) {
        try {
            const payload = JSON.parse(message.toString());
            window.log(`MQTT: ${topic}`);

            // MESMA logica do MagicMirror - MMM-AvatarMQTT.js linha 495-653

            // Protocolo NeoAlice v1
            if (topic.startsWith('neoalice/')) {
                const siteFromTopic = this.extractSiteId(topic);

                if (topic.endsWith('/cmd/tts/say') && payload) {
                    const text = (payload.tts && payload.tts.text) || payload.text || '';
                    if (text) {
                        this.avatarController.textStore.currentText = text;
                        if (payload.site_id) {
                            this.avatarController.textStore.siteTexts[payload.site_id] = text;
                        }
                        this.avatarController.speakText(text, payload.lang || this.config.language);
                    }
                }

                if (topic.endsWith('/cmd/tts/audio') && payload) {
                    const audioB64 = (payload.audio && payload.audio.b64) || payload.audio_base64;
                    if (audioB64) {
                        const text = (payload.tts && payload.tts.text) || payload.text || '';
                        if (text) {
                            this.avatarController.textStore.currentText = text;
                            if (payload.site_id) {
                                this.avatarController.textStore.siteTexts[payload.site_id] = text;
                            }
                        }
                        this.avatarController.speakAudio(audioB64, text);
                    }
                }

                if (topic.endsWith('/cmd/tts/stop')) {
                    this.avatarController.stopSpeaking();
                }

                if (topic.endsWith('/evt/stt/final') && payload) {
                    const text = (payload.stt && payload.stt.text) || payload.text || '';
                    if (text) {
                        this.avatarController.updateRecognizedText(text);
                    }
                }

                if (this.topicMatchesMood(topic) && payload) {
                    const mood = payload.mood || (payload.state && payload.state.mood);
                    if (mood) {
                        this.avatarController.setMood(mood);
                    }
                }

                // Avatar commands
                if (topic.endsWith('/cmd/avatar/gesture') && payload) {
                    const gesture = payload.gesture || payload.name || '';
                    if (gesture && this.avatarController.head) {
                        this.avatarController.playGesture(
                            gesture,
                            payload.duration || 3,
                            payload.mirror || false,
                            payload.transition || 1000
                        );
                    }
                }

                if (topic.endsWith('/cmd/avatar/emoji') && payload) {
                    const emoji = payload.emoji || '';
                    if (emoji && this.avatarController.head) {
                        this.avatarController.speakEmoji(emoji);
                    }
                }

                if (topic.endsWith('/cmd/avatar/pose') && payload) {
                    const pose = payload.pose || payload.name || '';
                    if (pose && this.avatarController.head) {
                        this.avatarController.setPose(pose);
                    }
                }

                if (topic.endsWith('/cmd/avatar/animation') && payload) {
                    const url = payload.url || '';
                    if (url && this.avatarController.head) {
                        this.avatarController.playAnimation(url, payload.duration || 10);
                    }
                }
            }

            // Protocolo Hermes (legado) - MESMO comportamento do MagicMirror
            if (topic === 'hermes/tts/say') {
                const text = payload.text || '';
                if (text) {
                    this.avatarController.textStore.currentText = text;
                    if (payload.siteId) {
                        this.avatarController.textStore.siteTexts[payload.siteId] = text;
                    }
                    this.avatarController.speakText(text, payload.lang || this.config.language);
                }
            }

            if (topic.includes('/playBytes/') || topic.includes('/playWav/')) {
                const rawData = message;
                const binary = Array.from(rawData);
                const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(rawData)));
                this.avatarController.speakAudio(base64, this.avatarController.textStore.currentText || '');
            }

            if (topic === 'hermes/asr/textCaptured') {
                const text = payload.text || '';
                if (text) {
                    this.avatarController.updateRecognizedText(text);
                }
            }

        } catch (e) {
            window.log('ERRO ao processar mensagem: ' + e);
        }
    }

    extractSiteId(topic) {
        // MESMA logica do MagicMirror - MMM-AvatarMQTT.js linha 821-828
        if (!topic) return null;
        const parts = topic.split('/');
        if (parts.length >= 4 && parts[0] === 'neoalice' && parts[1] === 'v1') {
            return parts[2];
        }
        return null;
    }

    topicMatchesMood(topic) {
        // MESMA logica do MagicMirror - MMM-AvatarMQTT.js linha 837-844
        const moodTopic = 'neoalice/v1/+/evt/mood';
        if (moodTopic.includes('+')) {
            return topic.includes('evt/mood');
        }
        return topic === moodTopic;
    }

    disconnect() {
        if (this.client) {
            this.client.end();
        }
    }
}
