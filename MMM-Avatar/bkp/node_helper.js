/* Magic Mirror
 * Node Helper: MMM-Avatar
 */

const NodeHelper = require("node_helper");
const mqtt = require("mqtt");

module.exports = NodeHelper.create({
    // Configuração inicial do Node Helper
    start: function() {
        console.log("Iniciando node_helper para o módulo: " + this.name);
        this.client = null;
        this.config = null;
        this.reconnectAttempts = 0;
        this.reconnectTimeout = null;
    },
    
    // Recebe notificações do módulo principal
    socketNotificationReceived: function(notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
            this.initMqtt();
        }
    },
    
    // Inicializa a conexão MQTT
    initMqtt: function() {
        if (!this.config) return;
        
        // Construa a URL do broker WebSocket
        const broker = `ws://${this.config.mqttBroker}:${this.config.mqttPort}`;
        console.log(`${this.name}: Conectando ao broker MQTT ${broker}`);
        
        // Fecha a conexão existente, se houver
        if (this.client) {
            this.client.end(true);
            this.client = null;
        }
        
        // Configurações de conexão
        const options = {
            clientId: this.config.mqttClientId,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000
        };
        
        try {
            // Criar cliente MQTT
            this.client = mqtt.connect(broker, options);
            this.setupEventHandlers();
        } catch (error) {
            console.error(`${this.name}: Erro ao iniciar conexão MQTT: ${error.message}`);
            this.sendSocketNotification("MQTT_ERROR", { error: error.message });
            this.scheduleReconnect();
        }
    },
    
    // Configura os manipuladores de eventos MQTT
    setupEventHandlers: function() {
        // Evento de conexão
        this.client.on('connect', () => {
            console.log(`${this.name}: Conectado ao broker MQTT`);
            this.reconnectAttempts = 0;
            
            // Notifica o módulo principal
            this.sendSocketNotification("MQTT_CONNECTED", { 
                broker: `${this.config.mqttBroker}:${this.config.mqttPort}` 
            });
            
            // Inscreve nos tópicos
            this.client.subscribe(this.config.mqttTopic, (err) => {
                if (err) {
                    console.error(`${this.name}: Erro ao se inscrever no tópico: ${err.message}`);
                    this.sendSocketNotification("MQTT_ERROR", { error: `Falha ao se inscrever: ${err.message}` });
                } else {
                    console.log(`${this.name}: Inscrito no tópico ${this.config.mqttTopic}`);
                }
            });
        });
        
        // Evento de erro
        this.client.on('error', (err) => {
            console.error(`${this.name}: Erro MQTT: ${err.message}`);
            this.sendSocketNotification("MQTT_ERROR", { error: err.message });
            this.scheduleReconnect();
        });
        
        // Evento de desconexão
        this.client.on('close', () => {
            console.log(`${this.name}: Desconectado do broker MQTT. Tentando reconectar...`);
            this.scheduleReconnect();
        });
        
        // Evento de reconexão
        this.client.on('reconnect', () => {
            console.log(`${this.name}: Tentando reconectar ao broker MQTT...`);
        });
        
        // Evento de recebimento de mensagem
        this.client.on('message', (topic, message) => {
            console.log(`${this.name}: Mensagem recebida no tópico: ${topic}`);
            
            try {
                // Processa mensagens de texto (TTS)
                if (topic === 'hermes/tts/say') {
                    try {
                        const data = JSON.parse(message.toString());
                        this.sendSocketNotification("MQTT_TEXT", {
                            text: data.text,
                            siteId: data.siteId,
                            lang: data.lang
                        });
                    } catch(e) {
                        console.error(`${this.name}: Erro ao processar texto: ${e.message}`);
                    }
                }
                
                // Processa mensagens de áudio
                else if (topic.includes('/playBytes/') || topic.includes('/playWav/')) {
                    // Enviamos o payload como buffer para ser processado no frontend
                    this.sendSocketNotification("MQTT_AUDIO", {
                        topic: topic,
                        payload: message
                    });
                }
                
                // Processa texto ASR capturado
                else if (topic === 'hermes/asr/textCaptured') {
                    try {
                        const data = JSON.parse(message.toString());
                        this.sendSocketNotification("MQTT_TEXT", {
                            text: data.text,
                            siteId: data.siteId
                        });
                    } catch(e) {
                        console.error(`${this.name}: Erro ao processar texto capturado: ${e.message}`);
                    }
                }
                
                // Eventos de hotword
                else if (topic === 'hermes/hotword/toggleOn') {
                    // Envia notificação para ativar o avatar
                    this.sendSocketNotification("MQTT_HOTWORD", { active: true });
                }
                
                // Outros eventos relevantes podem ser adicionados aqui
                
            } catch (ex) {
                console.error(`${this.name}: Erro ao processar mensagem: ${ex.message}`);
            }
        });
    },
    
    // Agenda uma tentativa de reconexão
    scheduleReconnect: function() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        // Backoff exponencial com limite máximo de 30 segundos
        const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
        this.reconnectAttempts++;
        
        console.log(`${this.name}: Tentativa de reconexão em ${delay/1000} segundos...`);
        
        this.reconnectTimeout = setTimeout(() => {
            console.log(`${this.name}: Reconectando...`);
            this.initMqtt();
        }, delay);
    },
    
    // Limpa recursos ao parar o módulo
    stop: function() {
        console.log(`${this.name}: Parando node_helper`);
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        if (this.client) {
            this.client.end(true);
            this.client = null;
        }
    }
});
