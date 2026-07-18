/* Magic Mirror
 * Module: MMM-Avatar
 * 
 * Módulo de avatar 3D com sincronização labial e integração MQTT
 */

Module.register("MMM-Avatar", {
    // Configurações padrão
    defaults: {
        updateInterval: 30000,
        avatarModelPath: "https://models.readyplayer.me/66d21fb928192d6953bf8712.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png", // URL do modelo (pode ser substituída por um caminho local)
        avatarBody: "F", 
        avatarMood: "happy",
        lipsyncLang: "pt-br",
        mqttBroker: "192.168.10.21",
        mqttPort: 1884,
        mqttTopic: "hermes/#",
        mqttClientId: "MagicMirror_Avatar_" + Math.random().toString(16).substr(2, 8),
        debug: true
    },

    // Variáveis do módulo
    head: null,
    textStore: {
        currentText: "",
        siteTexts: {}
    },
    
    // Necessário para carregar os scripts CSS
    getStyles: function() {
        return ["MMM-Avatar.css"];
    },

    // Carregar scripts necessários
    getScripts: function() {
        return [
            this.file("lib/three.module.js"),
            this.file("lib/mqtt.min.js")
        ];
    },

    // Inicializa o módulo
    start: function() {
        Log.info("Iniciando módulo: " + this.name);
        
        // Envia configuração para o node_helper
        this.sendSocketNotification("CONFIG", this.config);
        
        // Iniciar timer de atualização
        var self = this;
        setInterval(function() {
            self.updateDom();
        }, this.config.updateInterval);
        
        // Carregar dinamicamente o TalkingHead
        this.loadTalkingHead();
    },
    
    // Carregar a biblioteca TalkingHead
    loadTalkingHead: function() {
        var self = this;
        import(this.file("lib/talkinghead.mjs")).then(module => {
            self.TalkingHead = module.TalkingHead;
            self.log("Biblioteca TalkingHead carregada com sucesso");
        }).catch(error => {
            self.log("Erro ao carregar TalkingHead: " + error.message, "error");
        });
    },

    // Define o conteúdo HTML do módulo
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "avatar-wrapper";
        
        // Área do avatar
        const avatarDiv = document.createElement("div");
        avatarDiv.id = "avatar";
        avatarDiv.className = "avatar-container";
        wrapper.appendChild(avatarDiv);
        
        // Área de texto reconhecido
        const recognizedTextDiv = document.createElement("div");
        recognizedTextDiv.id = "recognizedText";
        recognizedTextDiv.className = "recognized-text";
        recognizedTextDiv.innerHTML = "Texto reconhecido aparecerá aqui.";
        wrapper.appendChild(recognizedTextDiv);
        
        // Indicador de carregamento
        const loadingDiv = document.createElement("div");
        loadingDiv.id = "loading";
        loadingDiv.className = "loading-indicator";
        loadingDiv.innerHTML = "Carregando Avatar...";
        wrapper.appendChild(loadingDiv);
        
        // Painel de debug (opcional)
        if (this.config.debug) {
            const debugDiv = document.createElement("div");
            debugDiv.id = "debug";
            debugDiv.className = "debug-panel";
            wrapper.appendChild(debugDiv);
        }
        
        return wrapper;
    },
    
    // Inicializa o avatar quando o DOM estiver pronto
    notificationReceived: function(notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
            if (this.TalkingHead) {
                this.initializeAvatar();
            }
        }
    },
    
    // Inicializa o avatar usando o TalkingHead
    initializeAvatar: async function() {
        if (!this.TalkingHead) {
            this.log("TalkingHead ainda não carregado", "warning");
            return;
        }
        
        const avatarDiv = document.getElementById("avatar");
        const loadingDiv = document.getElementById("loading");
        
        if (!avatarDiv) {
            this.log("Elemento do avatar não encontrado no DOM", "error");
            return;
        }
        
        try {
            // Inicializa o objeto TalkingHead
            this.head = new this.TalkingHead(avatarDiv, {
                ttsEndpoint: "", // Não usamos API de TTS externa
                lipsyncModules: ["pt-br", "pt", "en"],
                cameraView: "full",
                lipsyncPath: this.file("lib/lipsync/") // Caminho para os módulos de lipsync
            });
            
            // Carrega o modelo 3D
            await this.head.showAvatar({
                url: this.config.avatarModelPath,
                body: this.config.avatarBody,
                avatarMood: this.config.avatarMood,
                lipsyncLang: this.config.lipsyncLang
            }, (event) => {
                if (event.lengthComputable && loadingDiv) {
                    const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
                    loadingDiv.textContent = `Carregando Avatar: ${percent}%`;
                }
            });
            
            this.log("Avatar carregado com sucesso");
            if (loadingDiv) loadingDiv.style.display = "none";
            
            // Teste inicial (opcional)
            setTimeout(() => {
                this.head.speakText("Olá, estou pronta para processar áudio em português brasileiro", {
                    lipsyncLang: this.config.lipsyncLang
                });
            }, 2000);
            
        } catch (error) {
            this.log("Erro ao inicializar avatar: " + error.message, "error");
            if (loadingDiv) loadingDiv.textContent = "Erro ao carregar avatar.";
        }
    },
    
    // Processa notificações do node_helper
    socketNotificationReceived: function(notification, payload) {
        if (notification === "MQTT_CONNECTED") {
            this.log("Conectado ao broker MQTT: " + payload.broker);
        } 
        else if (notification === "MQTT_ERROR") {
            this.log("Erro MQTT: " + payload.error, "error");
        } 
        else if (notification === "MQTT_TEXT") {
            this.processText(payload);
        } 
        else if (notification === "MQTT_AUDIO") {
            this.processAudio(payload);
        }
    },
    
    // Processa mensagem de texto recebida
    processText: function(data) {
        this.log(`Texto recebido: "${data.text}"`);
        
        // Armazena o texto
        this.textStore.currentText = data.text || "";
        
        // Armazena por site ID se disponível
        if (data.siteId) {
            this.textStore.siteTexts[data.siteId] = data.text;
        }
        
        // Atualiza a interface
        const textNode = document.getElementById('recognizedText');
        if (textNode) {
            textNode.textContent = data.text;
        }
    },
    
    // Processa áudio recebido
    processAudio: async function(data) {
        if (!this.head) {
            this.log("Avatar não inicializado para processar áudio", "warning");
            return;
        }
        
        try {
            this.log(`Áudio recebido do tópico: ${data.topic}`);
            
            // Obtém o texto para o site ID, se disponível
            let text = "";
            const parts = data.topic.split('/');
            if (parts.length >= 3) {
                const siteId = parts[2];
                text = this.textStore.siteTexts[siteId] || this.textStore.currentText || "";
            }
            
            // Converte o payload para UInt8Array
            const rawBuffer = new Uint8Array(data.payload);
            
            try {
                // Decodifica o áudio
                let audiobuffer = await this.head.audioCtx.decodeAudioData(rawBuffer.buffer);
                
                // Cria objeto de áudio
                let audioObj = {
                    audio: audiobuffer,
                    text: text,
                    duration: Math.max(2000, text.length * 80)
                };
                
                // Se temos texto, criamos uma sincronização básica
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
                this.log("Áudio reproduzido com sucesso");
                
            } catch (decodeError) {
                this.log("Erro ao decodificar áudio, tentando método alternativo...", "warning");
                
                // Fallback quando o áudio não pode ser decodificado
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
            }
            
        } catch (e) {
            this.log("Erro ao processar áudio: " + e.message, "error");
        }
    },
    
    // Função de log melhorada
    log: function(message, level = "info") {
        const timestamp = new Date().toLocaleTimeString();
        const logMsg = `[${timestamp}] ${level === "info" ? "" : level.toUpperCase() + ": "}${message}`;
        
        // Log para o console do MagicMirror
        if (level === "error") {
            Log.error(`${this.name}: ${message}`);
        } else if (level === "warning") {
            Log.warn(`${this.name}: ${message}`);
        } else {
            Log.info(`${this.name}: ${message}`);
        }
        
        // Adiciona ao painel de debug
        if (this.config.debug) {
            const debugEl = document.getElementById("debug");
            if (debugEl) {
                const div = document.createElement('div');
                div.innerHTML = logMsg;
                
                if (level === "error") {
                    div.className = "log-error";
                } else if (level === "warning") {
                    div.className = "log-warning";
                } else {
                    div.className = "log-info";
                }
                
                debugEl.appendChild(div);
                
                // Limita o número de mensagens (mantém as últimas 100)
                while (debugEl.childNodes.length > 100) {
                    debugEl.removeChild(debugEl.firstChild);
                }
                
                // Rola para a última mensagem
                debugEl.scrollTop = debugEl.scrollHeight;
            }
        }
    }
});
