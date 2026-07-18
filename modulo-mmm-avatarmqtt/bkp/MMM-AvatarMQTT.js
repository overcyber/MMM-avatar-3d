/* Magic Mirror
 * Module: MMM-AvatarMQTT
 * 
 * By YourName
 * MIT Licensed.
 */

Module.register("MMM-AvatarMQTT", {
    // Default module config
    defaults: {
        width: "600px",         // Largura do avatar
        height: "600px",        // Altura do avatar
        MQTT_BROKER_WS: 'ws://192.168.10.21:1884',
        MQTT_CLIENT_ID: "EVA_MQTT_" + Math.random().toString(16).substr(2, 8),
        OPENAI_API_KEY: "",     // Deixe vazio por padrão para segurança
        avatarURL: 'https://models.readyplayer.me/66d21fb928192d6953bf8712.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png',
        language: "pt-br",
        debug: false,
        welcomeMessage: "Olá, estou pronta para processar áudio em português brasileiro",
        reconnectInterval: 5000, // Intervalo para tentar reconectar (ms)
        maxReconnectAttempts: 10, // Número máximo de tentativas de reconexão
        useMQTTBackend: true,    // Usar backend Node.js para MQTT (recomendado)
        mqttUser: "",           // Usuário MQTT (opcional)
        mqttPassword: "",        // Senha MQTT (opcional)
	useGoogleTTS: true,    // Se false, não usa TTS do Google, apenas movimentos labiais
        googleTTSEndpoint: "https://texttospeech.googleapis.com/v1/text:synthesize",
        googleTTSApiKey: "",    // Sua chave API para Google TTS (opcional)
        useSilentMode: false   
    },

    // Requisita scripts externos específicos
    getScripts: function() {
        return [
            this.file('node_modules/mqtt/dist/mqtt.min.js'),
            'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.min.js',
            'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js'
        ];
    },

    // Define start sequence
    start: function() {
        Log.info("Starting module: " + this.name);
        
        this.loaded = false;
        this.recognizedText = "Texto reconhecido aparecerá aqui.";
        this.reconnectAttempts = 0;
        this.mqttConnected = false;
        this.scriptErrors = [];
        this.avatar3DLoaded = false;
        
        // Envia config para o node_helper
        this.sendSocketNotification("CONFIG", this.config);
        
        // Define algumas variáveis para importações dinâmicas
        this.TalkingHeadClass = null;
        this.head = null;
        
        // Inicializa o armazenamento de texto
        this.textStore = {
            currentText: "",
            siteTexts: {}
        };

        // Importa TalkingHead dinamicamente usando import()
        this.loadTalkingHead();
    },

    // Carrega o módulo TalkingHead dinamicamente (ES module)
    loadTalkingHead: function() {
        const self = this;
        // Adiciona o atributo type="importmap" para o suporte ES modules
        const importMap = document.createElement('script');
        importMap.type = 'importmap';
        importMap.textContent = JSON.stringify({
            imports: {
                "three": "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/",
                "talkinghead": "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.2/modules/talkinghead.mjs"
            }
        });
        document.head.appendChild(importMap);
        
        // Após adicionar o importmap, carrega o módulo TalkingHead usando Dynamic Import
        setTimeout(() => {
            // Tenta importar o módulo TalkingHead
            import("talkinghead")
                .then(module => {
                    self.TalkingHeadClass = module.TalkingHead;
                    self.log("TalkingHead carregado com sucesso");
                    self.loaded = true;
                    
                    // Aguarda um pouco para garantir que o DOM foi atualizado
                    setTimeout(() => {
                        self.initializeAvatar();
                    }, 1000);
                })
                .catch(error => {
                    self.log("Erro ao carregar o módulo TalkingHead: " + error);
                    self.scriptErrors.push("TalkingHead: " + error.message);
                    
                    // Tenta uma abordagem alternativa com um script normal
                    self.loadScriptFallback("https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.2/modules/talkinghead.mjs", true);
                });
        }, 500);
    },
    
    // Fallback para carregar scripts se o import dinâmico falhar
    loadScriptFallback: function(url, isModule = false) {
        const self = this;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            if (isModule) script.type = "module";
            
            script.onload = function() {
                self.log("Script carregado via fallback: " + url);
                if (url.includes("talkinghead") && window.TalkingHead) {
                    self.TalkingHeadClass = window.TalkingHead;
                    self.loaded = true;
                    
                    setTimeout(() => {
                        self.initializeAvatar();
                    }, 1000);
                    resolve();
                } else {
                    resolve();
                }
            };
            
            script.onerror = function(err) {
                self.log("Erro ao carregar script via fallback: " + url);
                self.scriptErrors.push(url + ": " + err.message);
                reject(err);
            };
            
            document.head.appendChild(script);
        });
    },
    
Message.style.display = 'none';
            }
            
            this.log("Avatar carregado com sucesso!");
            
            // Inicializa MQTT
            this.initMQTT();
            
            // Mensagem de boas-vindas
            if (this.config.welcomeMessage) {
                setTimeout(() => {
                    this.head.speakText(this.config.welcomeMessage, {
                        lipsyncLang: this.config.language
                    });
                }, 2000);
            }
            
        } catch (error) {
            this.log("ERRO ao carregar avatar: " + error);
            const loadingMessage = document.getElementById("loading-message");
            if (loadingMessage) {
                loadingMessage.textContent = "Erro: " + error.toString();
            }
        }
    },
    
    // Inicializa a conexão MQTT diretamente no frontend
    initMQTT: function() {
        const self = this;
        this.log("Conectando ao broker MQTT: " + this.config.MQTT_BROKER_WS);
        
        // Verifica se MQTT.js está disponível
        if (typeof mqtt === 'undefined') {
            this.log("Erro: biblioteca MQTT não carregada");
            this.scriptErrors.push("MQTT não disponível");
            this.updateDom();
            
            // Tenta novamente após um tempo
            setTimeout(() => {
                self.initMQTT();
            }, this.config.reconnectInterval);
            return;
        }
        
        // Opções de conexão MQTT
        const mqttOptions = {
            clientId: this.config.MQTT_CLIENT_ID,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 10000
        };
        
        // Adiciona credenciais se configuradas
        if (this.config.mqttUser && this.config.mqttPassword) {
            mqttOptions.username = this.config.mqttUser;
            mqttOptions.password = this.config.mqttPassword;
        }

        try {
            this.mqttClient = mqtt.connect(this.config.MQTT_BROKER_WS, mqttOptions);

            this.mqttClient.on('connect', () => {
                self.log("✓ Conectado ao broker MQTT");
                self.mqttConnected = true;
                self.reconnectAttempts = 0;
                self.updateDom();
                
                // Inscreve em todos os tópicos relevantes
                self.mqttClient.subscribe('hermes/#', (err) => {
                    if (!err) self.log("✓ Inscrito em hermes/#");
                    else self.log("✗ Erro ao inscrever em hermes/#: " + err);
                });
                
                // Tópicos adicionais específicos
                const additionalTopics = [
                    'hermes/+/+/playBytes/#',
                    'hermes/+/+/playWav/#',
                    'hermes/intent/#',
                    'hermes/dialogueManager/#'
                ];
                
                additionalTopics.forEach(topic => {
                    self.mqttClient.subscribe(topic, (err) => {
                        if (!err) self.log("✓ Inscrito em " + topic);
                        else self.log("✗ Erro ao inscrever em " + topic + ": " + err);
                    });
                });
            });
            
            this.mqttClient.on('reconnect', () => {
                self.log("Tentando reconectar ao broker MQTT...");
            });
            
            this.mqttClient.on('offline', () => {
                self.log("MQTT desconectado. Offline.");
                self.mqttConnected = false;
                self.updateDom();
            });
            
            this.mqttClient.on('error', (err) => {
                self.log("ERRO MQTT: " + err);
                self.mqttConnected = false;
                self.updateDom();
                
                // Tenta reconectar se limite não foi atingido
                self.reconnectAttempts++;
                if (self.reconnectAttempts < self.config.maxReconnectAttempts) {
                    setTimeout(() => {
                        self.log(`Tentativa de reconexão ${self.reconnectAttempts}/${self.config.maxReconnectAttempts}`);
                        self.initMQTT();
                    }, self.config.reconnectInterval);
                } else {
                    self.log("Número máximo de tentativas de reconexão atingido");
                }
            });

            this.mqttClient.on('message', (topic, message) => {
                self.log(`Mensagem recebida no tópico: ${topic}`);
                
                // Processa mensagens de texto (TTS)
                if (topic === 'hermes/tts/say') {
                    try {
                        const data = JSON.parse(message.toString());
                        self.log(`Texto recebido: "${data.text}"`);
                        
                        // Armazena o texto globalmente
                        self.textStore.currentText = data.text || "";
                        
                        // Armazena por site ID se disponível
                        if (data.siteId) {
                            self.textStore.siteTexts[data.siteId] = data.text;
                        }
                        
                        // Atualiza a interface
                        self.updateRecognizedText(data.text);
                    } catch(e) {
                        self.log("Erro ao processar texto: " + e);
                    }
                }
                
                // Processa áudio
                else if (topic.includes('/playBytes/') || topic.includes('/playWav/')) {
                    self.processMQTTAudio(message, topic);
                }
                
                // Outros tópicos importantes
                else if (topic === 'hermes/asr/textCaptured') {
                    try {
                        const data = JSON.parse(message.toString());
                        self.log(`Texto capturado: "${data.text}"`);
                        self.updateRecognizedText(data.text);
                    } catch(e) {
                        self.log("Erro ao processar texto capturado: " + e);
                    }
                }
                
                // Captura intenções (intents) - útil para interações
                else if (topic.startsWith('hermes/intent/')) {
                    try {
                        const data = JSON.parse(message.toString());
                        const intent = topic.split('/').pop();
                        self.log(`Intenção detectada: ${intent}`);
                        
                        // Opcionalmente, pode processar intenções específicas
                        // Exemplo: if (intent === 'GetTime') { ... }
                    } catch(e) {
                        self.log("Erro ao processar intenção: " + e);
                    }
                }
            });
        } catch (e) {
            this.log("Erro ao iniciar MQTT: " + e);
            this.mqttConnected = false;
            this.updateDom();
        }
    },
    
    // Processa áudio recebido via MQTT
    processMQTTAudio: async function(rawData, topic) {
        try {
            if (!this.head || !this.head.audioCtx) {
                this.log("Avatar não inicializado completamente");
                return;
            }
            
            this.log("Áudio MQTT recebido no tópico: " + topic);
            
            // Obtém o texto para o site ID, se disponível
            let text = "";
            const parts = topic.split('/');
            if (parts.length >= 3) {
                const siteId = parts[2];
                text = this.textStore.siteTexts[siteId] || this.textStore.currentText || "";
            }
            
            // Prepara o áudio - verificamos se é um Array (do node_helper) ou um Buffer direto
            let rawBuffer;
            if (Array.isArray(rawData)) {
                rawBuffer = new Uint8Array(rawData);
            } else {
                rawBuffer = new Uint8Array(rawData);
            }
            
            let arraybuffer = rawBuffer.buffer;
            
            try {
                this.log("Decodificando áudio...");
                let audiobuffer = await this.head.audioCtx.decodeAudioData(arraybuffer);
                
                // Cria um objeto de áudio simples
                let audioObj = {
                    audio: audiobuffer,
                    text: text,
                    duration: Math.max(2000, text.length * 80)
                };
                
                // Se temos texto, tentamos criar uma sincronização básica
                if (text) {
                    const words = text.split(/\s+/);
                    if (words.length > 0) {
                        audioObj.words = words;
                        audioObj.wtimes = [];
                        audioObj.wdurations = [];
                        
                        // Distribui palavras ao longo do tempo
                        const timePerWord = audioObj.duration / words.length;
                        words.forEach((word, i) => {
                            audioObj.wtimes.push(i * timePerWord);
                            audioObj.wdurations.push(timePerWord * 0.8);
                        });
                    }
                }
                
                // Reproduz o áudio
                this.head.speakAudio(audioObj);
                this.log("Áudio MQTT reproduzido com sucesso");
                
            } catch (decodeError) {
                this.log("Erro ao decodificar áudio, tentando método alternativo...");
                
                // Alternativa para áudio que não pode ser decodificado
                if (this.head.audioCtx) {
                    try {
                        const dummyBuffer = new AudioBuffer({
                            length: 22050,
                            numberOfChannels: 1,
                            sampleRate: 22050
                        });
                        
                        this.head.speakAudio({
                            audio: dummyBuffer,
                            text: text,
                            duration: Math.max(2000, text.length * 80)
                        });
                        
                        this.log("Usado método alternativo para reprodução");
                    } catch (e) {
                        this.log("Erro no método alternativo: " + e);
                    }
                }
            }
            
        } catch (e) {
            this.log("ERRO ao processar áudio MQTT: " + e);
        }
    },
    
    // Atualiza o texto reconhecido na interface
    updateRecognizedText: function(text) {
        this.recognizedText = text;
        const textNode = document.getElementById("recognized-text-" + this.identifier);
        if (textNode) {
            textNode.textContent = text;
        }
    },
    
    // Função para falar texto
    speakText: function(text, options = {}) {
        if (!this.head) {
            this.log("Avatar não inicializado");
            return;
        }
        
        try {
            // Atualiza o texto exibido
            this.updateRecognizedText(text);
            
            // Fala o texto usando o avatar
            this.head.speakText(text, {
                lipsyncLang: options.language || this.config.language,
                ...options
            });
            
            this.log("Falando texto: " + text);
            
            // Opcionalmente, envia para MQTT também
            if (this.config.useMQTTBackend) {
                this.sendSocketNotification("SPEAK_TEXT", {
                    text: text,
                    options: options
                });
            }
        } catch (e) {
            this.log("Erro ao falar texto: " + e);
        }
    },
    
    // Função de log que respeita o modo debug
    log: function(message) {
        if (this.config.debug) {
            Log.info("[" + this.name + "] " + message);
            const debugArea = document.getElementById("debug-area-" + this.identifier);
            if (debugArea) {
                const timestamp = new Date().toLocaleTimeString();
                debugArea.innerHTML += `[${timestamp}] ${message}<br>`;
                debugArea.scrollTop = debugArea.scrollHeight;
            }
        }
    },
    
    // Manipula notificações do node_helper
    socketNotificationReceived: function(notification, payload) {
        const self = this;
        
        switch (notification) {
            case "MQTT_MESSAGE":
                // Processa mensagem MQTT recebida do node_helper
                this.log("Recebido do node_helper: " + payload.topic);
                if (payload.topic === 'hermes/tts/say' && payload.message) {
                    this.updateRecognizedText(payload.message.text || "");
                    
                    // Se o avatar estiver carregado, fala o texto
                    if (this.head && this.avatar3DLoaded) {
                        this.speakText(payload.message.text || "", {
                            siteId: payload.message.siteId,
                            language: payload.message.lang || this.config.language
                        });
                    }
                }
                break;
                
            case "MQTT_AUDIO":
                // Processa buffer de áudio do node_helper
                this.log("Recebido áudio do node_helper: " + payload.topic);
                if (this.head && this.avatar3DLoaded) {
                    this.processMQTTAudio(payload.buffer, payload.topic);
                }
                break;
                
            case "AUDIO_FILE":
                // Processa arquivo de áudio do node_helper
                this.log("Recebido arquivo de áudio: " + payload.filename);
                // Poderia implementar carregamento de arquivo local, mas na prática
                // usamos o buffer diretamente via MQTT_AUDIO
                break;
                
            case "MQTT_CONNECTED":
                this.log("Backend MQTT conectado");
                this.mqttConnected = true;
                this.updateDom();
                break;
                
            case "MQTT_DISCONNECTED":
                this.log("Backend MQTT desconectado");
                this.mqttConnected = false;
                this.updateDom();
                break;
                
            case "MQTT_ERROR":
                this.log("Erro MQTT no backend: " + (payload.error || "desconhecido"));
                this.mqttConnected = false;
                this.updateDom();
                break;
                
            case "MQTT_INTENT":
                // Processa intenções específicas
                const intent = payload.intent;
                this.log("Intenção recebida: " + intent);
                
                // Aqui podemos processar intenções específicas
                // Por exemplo: if (intent === 'GetTime') { ... }
                break;
        }
    },
    
    // Manipula notificações de outros módulos
    notificationReceived: function(notification, payload, sender) {
        // Responde a notificações de outros módulos
        if (notification === "AVATAR_SPEAK") {
            // Permite que outros módulos façam o avatar falar
            if (payload && typeof payload === 'string') {
                this.speakText(payload);
            } else if (payload && typeof payload === 'object') {
                this.speakText(payload.text || "", payload.options || {});
            }
        }
        
        // Pode adicionar mais notificações aqui
        else if (notification === "DOM_OBJECTS_CREATED") {
            // MagicMirror DOM completamente carregado
            this.log("DOM objects created");
        }
    }
});

        const textNode = document.getElementById("recognized-text");
        if (textNode) {
            textNode.textContent = text;
        }
    },
    
    // Função de log que respeita o modo debug
    log: function(message) {
        if (this.config.debug) {
            Log.info("[" + this.name + "] " + message);
            const debugArea = document.getElementById("debug-area");
            if (debugArea) {
                const timestamp = new Date().toLocaleTimeString();
                debugArea.innerHTML += `[${timestamp}] ${message}<br>`;
                debugArea.scrollTop = debugArea.scrollHeight;
            }
        }
    },
    
    // Manipula notificações do node_helper
    socketNotificationReceived: function(notification, payload) {
        if (notification === "MQTT_MESSAGE") {
            // Processa mensagem MQTT recebida do node_helper
            this.log("Recebido do node_helper: " + payload.topic);
            if (payload.topic === 'hermes/tts/say' && payload.message) {
                this.updateRecognizedText(payload.message.text || "");
            }
        }
    }
});
