/* Magic Mirror
 * Module: MMM-Avatar
 * 
 * Avatar MQTT em Português Brasileiro
 */

Module.register("MMM-Avatar", {
    // Configurações padrão
    defaults: {
        updateInterval: 30000,
        avatarModelPath: "https://models.readyplayer.me/66d21fb928192d6953bf8712.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png",
        avatarBody: "F",
        avatarMood: "happy",
        lipsyncLang: "pt-br",
        mqttBroker: "192.168.10.21",
        mqttPort: 1884,
        mqttClientId: "MagicMirror_Avatar_" + Math.random().toString(16).substr(2, 8),
        debug: true
    },

    // Recursos adicionais necessários
    getStyles: function() {
        return ["MMM-Avatar.css"];
    },

    // Scripts adicionais
    getScripts: function() {
        return [
            "https://unpkg.com/mqtt/dist/mqtt.min.js"
        ];
    },

    // Injeção de scripts de módulos ES
    getHeader: function() {
        // Injetar importmap para permitir imports de ESM
        const importMapScript = document.createElement("script");
        importMapScript.type = "importmap";
        importMapScript.textContent = JSON.stringify({
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js/+esm",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/",
                "talkinghead": "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.2/modules/talkinghead.mjs"
            }
        });
        document.head.appendChild(importMapScript);
        
        return this.data.header;
    },

    // Inicializando o módulo
    start: function() {
        Log.info("Iniciando módulo: " + this.name);
        
        // Variáveis do módulo
        this.head = null;
        this.mqttClient = null;
        this.currentAudio = null;
        this.textStore = {
            currentText: "",
            siteTexts: {}
        };
        
        // Timer de atualização
        var self = this;
        setInterval(function() {
            self.updateDom();
        }, this.config.updateInterval);
    },

    // Criação do DOM
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
        
        return wrapper;
    },
    
    // Quando o DOM estiver pronto
    notificationReceived: function(notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
            this.initializeTalkingHead();
        }
    },
    
    // Inicialização do TalkingHead e Avatar
    initializeTalkingHead: function() {
        const self = this;
        
        // Importar diretamente o módulo TalkingHead usando ESM (mesmo método do código original)
        import("talkinghead").then(module => {
            const TalkingHead = module.TalkingHead;
            this.log("Biblioteca TalkingHead carregada com sucesso");
            
            // Iniciar o avatar
            this.initializeAvatar(TalkingHead);
        }).catch(error => {
            this.log("Erro ao carregar TalkingHead: " + error, "error");
            setTimeout(() => this.initializeTalkingHead(), 5000); // Tentar novamente após 5 segundos
        });
    },
    
    // Inicialização do avatar
    initializeAvatar: async function(TalkingHead) {
        try {
            const nodeAvatar = document.getElementById('avatar');
            const nodeLoading = document.getElementById('loading');
            
            if (!nodeAvatar) {
                this.log("Elemento avatar não encontrado no DOM", "error");
                return;
            }
            
            this.log("Instanciando TalkingHead...");
            
            // Instancia o TalkingHead (exatamente como no código original)
            this.head = new TalkingHead(nodeAvatar, {
                ttsEndpoint: "", // Não usamos TTS externo
                lipsyncModules: ["pt-br", "pt", "en"],
                cameraView: "full"
            });
            
            this.log("Carregando avatar...");
            
            // Carrega e mostra o avatar
            await this.head.showAvatar({
                url: this.config.avatarModelPath,
                body: this.config.avatarBody,
                avatarMood: this.config.avatarMood,
                lipsyncLang: this.config.lipsyncLang
            }, (ev) => {
                if (ev.lengthComputable && nodeLoading) {
                    let val = Math.min(100, Math.round(ev.loaded / ev.total * 100));
                    nodeLoading.textContent = "Carregando " + val + "%";
                }
            });
            
            if (nodeLoading) {
                nodeLoading.style.display = 'none';
            }
            
            this.log("Avatar carregado com sucesso!");
            
            // Inicializa MQTT (diretamente como no código original, não via node_helper)
            this.initMQTT();
            
            // Teste simples depois de 2 segundos
            setTimeout(() => {
                this.head.speakText("Olá, estou pronta para processar áudio em português brasileiro", {
                    lipsyncLang: this.config.lipsyncLang
                });
            }, 2000);
            
        } catch (error) {
            this.log("ERRO ao carregar avatar: " + error, "error");
            const nodeLoading = document.getElementById('loading');
            if (nodeLoading) {
                nodeLoading.textContent = "Erro: " + error.toString();
            }
        }
    },
    
    // Inicializa a conexão MQTT direta (como no código original)
    initMQTT: function() {
        const wsUrl = 'ws://' + this.config.mqttBroker + ':' + this.config.mqttPort;
        this.log("Conectando ao broker MQTT: " + wsUrl);
        
        this.mqttClient = mqtt.connect(wsUrl, { 
            clientId: this.config.mqttClientId,
            clean: true,
            reconnectPeriod: 5000
        });
        
        this.mqttClient.on('connect', () => {
            this.log("✓ Conectado ao broker MQTT");
            
            // Inscreve em todos os tópicos relevantes
            this.mqttClient.subscribe('hermes/#', (err) => {
                if (!err) this.log("✓ Inscrito em hermes/#");
                else this.log("✗ Erro ao inscrever em hermes/#: " + err, "error");
            });
        });
        
        this.mqttClient.on('error', (err) => {
            this.log("ERRO MQTT: " + err, "error");
        });
        
        this.mqttClient.on('message', (topic, message) => {
            this.log(`Mensagem recebida no tópico: ${topic}`);
            
            // Processa mensagens de texto (TTS)
            if (topic === 'hermes/tts/say') {
                try {
                    const data = JSON.parse(message.toString());
                    this.log(`Texto recebido: "${data.text}"`);
                    
                    // Armazena o texto globalmente
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
                } catch(e) {
                    this.log("Erro ao processar texto: " + e, "error");
                }
            }
            
            // Processa áudio
            else if (topic.includes('/playBytes/') || topic.includes('/playWav/')) {
                this.processMQTTAudio(message, topic);
            }
            
            // Outros tópicos importantes
            else if (topic === 'hermes/asr/textCaptured') {
                try {
                    const data = JSON.parse(message.toString());
                    this.log(`Texto capturado: "${data.text}"`);
                    const textNode = document.getElementById('recognizedText');
                    if (textNode) {
                        textNode.textContent = data.text;
                    }
                } catch(e) {
                    this.log("Erro ao processar texto capturado: " + e, "error");
                }
            }
        });
    },
    
    // Processa áudio recebido via MQTT (exatamente como no código original)
    processMQTTAudio: async function(rawData, topic) {
        if (!this.head) {
            this.log("Avatar não inicializado para processar áudio", "warning");
            return;
        }
        
        try {
            this.log(`Áudio MQTT recebido no tópico: ${topic}`);
            
            // Obtém o texto para o site ID, se disponível
            let text = "";
            const parts = topic.split('/');
            if (parts.length >= 3) {
                const siteId = parts[2];
                text = this.textStore.siteTexts[siteId] || this.textStore.currentText || "";
            }
            
            // Prepara o áudio
            const rawBuffer = new Uint8Array(rawData);
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
                this.log("✓ Áudio MQTT reproduzido com sucesso");
                
            } catch (decodeError) {
                this.log("Erro ao decodificar áudio, tentando método alternativo...", "warning");
                
                // Alternativa para áudio que não pode ser decodificado
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
                
                this.log("⚠️ Usado método alternativo para reprodução");
            }
            
        } catch (e) {
            this.log("ERRO ao processar áudio MQTT: " + e, "error");
        }
    },
    
    // Funções de log
    log: function(message, level = "info") {
        // Log para o console
        if (level === "error") {
            Log.error(`${this.name}: ${message}`);
            console.error(`[${this.name}] ${message}`);
        } else if (level === "warning") {
            Log.warn(`${this.name}: ${message}`);
            console.warn(`[${this.name}] ${message}`);
        } else {
            Log.info(`${this.name}: ${message}`);
            console.log(`[${this.name}] ${message}`);
        }
    }
});
