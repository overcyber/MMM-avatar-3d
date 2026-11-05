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
        MQTT_BROKER_WS: 'ws://192.168.10.14:1884',
        MQTT_BROKER: 'mqtt://192.168.10.14:1883', // usado pelo backend (node_helper). Se vazio, cai no MQTT_BROKER_WS.
        MQTT_BROKERS: 'mqtt://127.0.0.1:1883,mqtt://192.168.10.14:1883', // tenta múltiplos brokers (backend)
        MQTT_CLIENT_ID: "EVA_MQTT_" + Math.random().toString(16).substr(2, 8),
        OPENAI_API_KEY: "",     // Deixe vazio por padrão para segurança
        // Avatar e TalkingHead do servidor local (porta 8081). O Ready Player Me encerrou o servico,
        // entao o endereco antigo de models.readyplayer.me nao serve mais como padrao.
        avatarURL: 'http://localhost:8081/avatars/eva2.glb',
        talkingHeadBaseURL: "", // Se vazio, usa a origem do avatarURL
        // Copia local do three.js 0.161.0, instalada por `npm install` na pasta do modulo.
        // O MagicMirror serve a pasta do modulo em /modules/MMM-AvatarMQTT/.
        threeBaseURL: "/modules/MMM-AvatarMQTT/node_modules/three",
        // Se true, usa o CDN (jsDelivr) quando a copia local falha. Desligado para funcionar sem internet.
        allowCdnFallback: false,
        language: "pt-br",
        debug: false,
        welcomeMessage: "Olá, estou pronta para processar áudio em português brasileiro",
        reconnectInterval: 5000, // Intervalo para tentar reconectar (ms)
        maxReconnectAttempts: 10, // Número máximo de tentativas de reconexão
        useMQTTBackend: true,    // Usar backend Node.js para MQTT (recomendado)
        mqttUser: "",           // Usuário MQTT (opcional)
        mqttPassword: "",       // Senha MQTT (opcional)
        siteId: "",             // Se definido, filtra mensagens MQTT para este site_id
        acceptAnySite: true,    // Se true, aceita áudio/texto de qualquer site_id
        moodTopic: "neoalice/v1/+/evt/mood", // Tópico para receber humor do avatar
        publishState: true,     // Publica evt/state para registrar o site como ativo
        stateHeartbeatSeconds: 30, // Intervalo do heartbeat evt/state
        stateValue: "idle",     // state.value publicado no evt/state
        stateDetail: "hb",      // state.detail publicado no evt/state
        stateUserId: "",        // user_id opcional para evt/state (UUID)
        // Configurações de TTS
        useGoogleTTS: true,    // Se false, não usa TTS do Google, apenas movimentos labiais
        googleTTSEndpoint: "https://texttospeech.googleapis.com/v1/text:synthesize",
        googleTTSApiKey: "",    // Sua chave API para Google TTS (opcional)
        useSilentMode: false     // Modo silencioso: apenas sincronização labial sem áudio
    },

    // Requisita scripts externos específicos
    getScripts: function() {
        return [
            this.file('node_modules/mqtt/dist/mqtt.min.js')
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
        this.currentMood = "happy";
        this.talkingHeadModuleURL = this.resolveTalkingHeadModuleURL();
        
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

    resolveTalkingHeadModuleURL: function() {
        const configuredBaseURL = (this.config.talkingHeadBaseURL || "").trim().replace(/\/$/, "");
        if (configuredBaseURL) {
            return configuredBaseURL + "/modules/talkinghead.mjs";
        }

        try {
            const avatarOrigin = new URL(this.config.avatarURL).origin;
            return avatarOrigin + "/modules/talkinghead.mjs";
        } catch (error) {
            this.log("Nao foi possivel derivar a URL do TalkingHead a partir do avatarURL: " + error);
            return this.config.allowCdnFallback
                ? "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.2/modules/talkinghead.mjs"
                : "http://localhost:8081/modules/talkinghead.mjs";
        }
    },

    // Monta o importmap do three.js e do TalkingHead.
    // O talkinghead.mjs do servidor local importa o three.js direto de https://esm.sh/three@0.161.0.
    // Estas entradas redirecionam esses enderecos para a copia local, entao o avatar carrega sem internet.
    buildImportMap: function() {
        const base = (this.config.threeBaseURL || "").trim().replace(/\/$/, "") || "/modules/MMM-AvatarMQTT/node_modules/three";
        const module = base + "/build/three.module.js";
        const addons = base + "/examples/jsm/";
        return {
            imports: {
                "three": module,
                "three/addons/": addons,
                "https://esm.sh/three@0.161.0": module,
                "https://esm.sh/three@0.161.0/build/three.module.js": module,
                "https://esm.sh/three@0.161.0/examples/jsm/": addons,
                "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js": module,
                "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/": addons,
                "talkinghead": this.talkingHeadModuleURL
            }
        };
    },

    // Carrega o módulo TalkingHead dinamicamente (ES module)
    loadTalkingHead: function() {
        const self = this;
        // Adiciona o atributo type="importmap" para o suporte ES modules
        const importMap = document.createElement('script');
        importMap.type = 'importmap';
        importMap.textContent = JSON.stringify(this.buildImportMap());
        document.head.appendChild(importMap);
        
        // Após adicionar o importmap, carrega o módulo TalkingHead usando Dynamic Import
        setTimeout(() => {
            // Tenta importar o módulo TalkingHead
            import("talkinghead")
                .then(module => {
                    self.TalkingHeadClass = module.TalkingHead;
                    self.log("TalkingHead carregado com sucesso de " + self.talkingHeadModuleURL);
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
                    const fallback = self.loadScriptFallback(self.talkingHeadModuleURL, true);
                    if (self.config.allowCdnFallback) {
                        fallback.catch(() => self.loadScriptFallback("https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.2/modules/talkinghead.mjs", true));
                    } else {
                        fallback.catch(() => self.log("TalkingHead indisponivel no servidor local e o CDN esta desligado (allowCdnFallback: false)"));
                    }
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
    
    // Obtém estilos do módulo
    getStyles: function() {
        return ["MMM-AvatarMQTT.css"];
    },
    
    // Conteúdo HTML do módulo
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "mmm-avatarmqtt-wrapper";
        
        // Status de carregamento de scripts
        if (this.scriptErrors.length > 0) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "script-error";
            errorDiv.innerHTML = "Erro ao carregar scripts: " + this.scriptErrors.join("<br>");
            wrapper.appendChild(errorDiv);
            return wrapper;
        }
        
        // Container do avatar
        const avatarDiv = document.createElement("div");
        avatarDiv.id = "avatar-container-" + this.identifier;
        avatarDiv.className = "avatar-container";
        avatarDiv.style.width = this.config.width;
        avatarDiv.style.height = this.config.height;
        wrapper.appendChild(avatarDiv);
        
        // Mensagem de carregamento
        const loadingDiv = document.createElement("div");
        loadingDiv.id = "loading-message-" + this.identifier;
        loadingDiv.className = "loading-message";
        loadingDiv.textContent = this.avatar3DLoaded ? "" : "Carregando avatar...";
        wrapper.appendChild(loadingDiv);
        
        // Área de texto reconhecido
        const textDiv = document.createElement("div");
        textDiv.id = "recognized-text-" + this.identifier;
        textDiv.className = "recognized-text";
        textDiv.textContent = this.recognizedText;
        wrapper.appendChild(textDiv);
        
        // Área de debug (oculta por padrão)
        if (this.config.debug) {
            const debugDiv = document.createElement("div");
            debugDiv.id = "debug-area-" + this.identifier;
            debugDiv.className = "debug-area";
            debugDiv.style.display = this.config.debug ? "block" : "none";
            wrapper.appendChild(debugDiv);
        }
        
        // Status MQTT
        const statusDiv = document.createElement("div");
        statusDiv.id = "mqtt-status-" + this.identifier;
        statusDiv.className = "mqtt-status";
        statusDiv.textContent = this.mqttConnected ? "MQTT Conectado" : "MQTT Desconectado";
        statusDiv.style.backgroundColor = this.mqttConnected ? "rgba(0, 128, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
        statusDiv.style.display = this.config.debug ? "block" : "none";
        wrapper.appendChild(statusDiv);
        
        return wrapper;
    },
    
    // Inicializa o avatar quando os scripts estiverem prontos
    initializeAvatar: async function() {
        const self = this;
        
        // Verificações de segurança - garante que o TalkingHead está disponível
        if (!this.TalkingHeadClass) {
            this.log("Erro: TalkingHead não carregado corretamente");
            this.scriptErrors.push("TalkingHead não disponível");
            this.updateDom();
            return;
        }
        
        this.log("Iniciando avatar...");
        
        try {
            // Usa ID único para evitar conflitos em múltiplas instâncias
            const containerId = "avatar-container-" + this.identifier;
            const loadingId = "loading-message-" + this.identifier;
            
            const avatarContainer = document.getElementById(containerId);
            const loadingMessage = document.getElementById(loadingId);
            
            if (!avatarContainer) {
                this.log("Erro: Container do avatar não encontrado no DOM");
                setTimeout(() => this.initializeAvatar(), 1000); // Tenta novamente
                return;
            }
            
            // Configura o TTS endpoint
            let ttsConfig = {
                lipsyncModules: ["pt-br", "pt", "en"],
                cameraView: this.config.cameraView || "full"  // full, upper, mid, head
            };
            
            // Adiciona endpoint TTS se configurado
            if (this.config.useGoogleTTS) {
                let endpoint = this.config.googleTTSEndpoint;
                
                // Adiciona a chave API ao endpoint se fornecida
                if (this.config.googleTTSApiKey) {
                    if (endpoint.includes('?')) {
                        endpoint += `&key=${this.config.googleTTSApiKey}`;
                    } else {
                        endpoint += `?key=${this.config.googleTTSApiKey}`;
                    }
                }
                
                ttsConfig.ttsEndpoint = endpoint;
                this.log("Usando endpoint TTS: " + endpoint);
            } else {
                // Modo silencioso - usa um endpoint fictício que nunca será chamado
                ttsConfig.ttsEndpoint = "silent://notts.local";
                this.log("Modo silencioso ativado - sem TTS externo");
            }
            
            // Inicializa o TalkingHead
            this.head = new this.TalkingHeadClass(avatarContainer, ttsConfig);
            
            // Carrega o modelo 3D
            await this.head.showAvatar({
                url: this.config.avatarURL,
                body: 'F',
                avatarMood: this.currentMood || 'happy',
                lipsyncLang: this.config.language
            }, (ev) => {
                if (ev.lengthComputable && loadingMessage) {
                    let val = Math.min(100, Math.round(ev.loaded / ev.total * 100));
                    loadingMessage.textContent = "Carregando " + val + "%";
                }
            });
            
            // Esconde a mensagem de carregamento
            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }
            
            this.log("Avatar carregado com sucesso!");
            this.avatar3DLoaded = true;
            
            // Inicializa MQTT - frontend ou backend
            if (this.config.useMQTTBackend) {
                this.log("Usando backend para MQTT");
                // O node_helper já está lidando com MQTT
                this.mqttConnected = true;
            } else {
                this.log("Usando frontend para MQTT");
                this.initMQTT();
            }
            
            // Mensagem de boas-vindas
            if (this.config.welcomeMessage) {
                setTimeout(() => {
                    // Aplica humor corrente antes de falar
                    this.applyMood(this.currentMood);
                    if (this.config.useSilentMode) {
                        // No modo silencioso, usa um objeto de áudio vazio com apenas texto
                        this.speakSilent(this.config.welcomeMessage);
                    } else {
                        // Usa TTS normal
                        this.head.speakText(this.config.welcomeMessage, {
                            lipsyncLang: this.config.language
                        });
                    }
                }, 2000);
            }
            
        } catch (error) {
            this.log("ERRO ao carregar avatar: " + error);
            const loadingMessage = document.getElementById("loading-message-" + this.identifier);
            if (loadingMessage) {
                loadingMessage.textContent = "Erro: " + error.toString();
            }
            
            // Registra o erro para debugar
            this.scriptErrors.push("Avatar: " + error.message);
            this.updateDom();
        }
    },
    
    // Função para falar no modo silencioso (sem áudio, apenas movimento labial)
    speakSilent: function(text) {
        if (!this.head || !this.head.audioCtx) {
            this.log("Avatar não inicializado para modo silencioso");
            return;
        }
        
        try {
            // Cria um buffer de áudio curto e vazio
            const sampleRate = this.head.audioCtx.sampleRate || 22050;
            const dummyBuffer = this.head.audioCtx.createBuffer(
                1,                   // canais
                sampleRate * 0.5,    // duração de 0.5 segundo
                sampleRate           // taxa de amostragem
            );
            
            // Divide o texto em palavras
            const words = text.split(/\s+/);
            if (words.length === 0) return;
            
            // Cria um objeto de áudio com sincronização labial
            const audioObj = {
                audio: dummyBuffer,
                text: text,
                duration: Math.max(2000, text.length * 80), // Tempo baseado no comprimento do texto
                words: words,
                wtimes: [],
                wdurations: []
            };
            
            // Distribui as palavras uniformemente no tempo
            const timePerWord = audioObj.duration / words.length;
            words.forEach((word, i) => {
                audioObj.wtimes.push(i * timePerWord);
                audioObj.wdurations.push(timePerWord * 0.8);
            });
            
            // Reproduz usando o objeto de áudio
            this.head.speakAudio(audioObj);
            this.log("Falando em modo silencioso: " + text);
            
        } catch (e) {
            this.log("Erro no modo silencioso: " + e);
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
                
                const topics = [
                    'neoalice/v1/+/cmd/tts/say',
                    'neoalice/v1/+/cmd/tts/audio',
                    'neoalice/v1/+/cmd/tts/stop',
                    'neoalice/v1/+/evt/stt/final',
                    self.config.moodTopic || 'neoalice/v1/+/evt/mood',
                    'neoalice/v1/+/cmd/evt/mood',
                    // Novos topicos para controle do avatar
                    'neoalice/v1/+/cmd/avatar/gesture',
                    'neoalice/v1/+/cmd/avatar/emoji',
                    'neoalice/v1/+/cmd/avatar/pose',
                    'neoalice/v1/+/cmd/avatar/animation',
                    'hermes/#', // compat legado
                    'hermes/+/+/playBytes/#',
                    'hermes/+/+/playWav/#',
                    'hermes/intent/#',
                    'hermes/dialogueManager/#'
                ];
                
                topics.forEach(topic => {
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
                
                // Primeira prioridade: protocolo NeoAlice v1
                if (topic.startsWith('neoalice/')) {
                    let data;
                    try {
                        data = JSON.parse(message.toString());
                    } catch (e) {
                        self.log("Payload não é JSON válido");
                    }
                    const siteFromTopic = self.extractSiteId(topic);
                    if (!self.matchesSite(siteFromTopic)) {
                        return;
                    }
                    
                    if (topic.endsWith('/cmd/tts/say') && data) {
                        const text = (data.tts && data.tts.text) || data.text || "";
                        if (!text) return;
                        self.textStore.currentText = text;
                        if (data.site_id) self.textStore.siteTexts[data.site_id] = text;
                        self.updateRecognizedText(text);
                        if (self.config.useSilentMode) {
                            self.speakSilent(text);
                        } else if (self.head) {
                            self.head.speakText(text, {
                                lipsyncLang: data.lang || self.config.language
                            });
                        }
                        return;
                    }
                    
                    if (topic.endsWith('/cmd/tts/audio') && data) {
                        const audioB64 = (data.audio && data.audio.b64) || data.audio_base64;
                        if (!audioB64) return;
                        const text = (data.tts && data.tts.text) || data.text || "";
                        if (text) {
                            self.textStore.currentText = text;
                            if (data.site_id) self.textStore.siteTexts[data.site_id] = text;
                            self.updateRecognizedText(text);
                        }
                        const binary = atob(audioB64);
                        const arr = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            arr[i] = binary.charCodeAt(i);
                        }
                        self.processMQTTAudio(arr, topic);
                        return;
                    }
                    
                    if (topic.endsWith('/cmd/tts/stop')) {
                        if (self.head && typeof self.head.stopSpeaking === 'function') {
                            self.head.stopSpeaking();
                        } else if (self.head && typeof self.head.pauseSpeaking === 'function') {
                            self.head.pauseSpeaking();
                        }
                        return;
                    }
                    
                    if (topic.endsWith('/evt/stt/final') && data) {
                        const text = (data.stt && data.stt.text) || data.text || "";
                        if (text) {
                            self.updateRecognizedText(text);
                        }
                        return;
                    }
                    
                    if (self.topicMatchesMood(topic) && data) {
                        const mood = data.mood || (data.state && data.state.mood);
                        if (mood) self.applyMood(mood);
                        return;
                    }

                    // Novos handlers para controle do avatar
                    if (topic.endsWith('/cmd/avatar/gesture') && data) {
                        const gesture = data.gesture || data.name || "";
                        const duration = data.duration || 3;
                        const mirror = data.mirror || false;
                        const transition = data.transition || 1000;
                        if (gesture && self.head) {
                            self.head.playGesture(gesture, duration, mirror, transition);
                            self.log("Gesto executado: " + gesture);
                        }
                        return;
                    }

                    if (topic.endsWith('/cmd/avatar/emoji') && data) {
                        const emoji = data.emoji || "";
                        if (emoji && self.head) {
                            self.head.speakEmoji(emoji);
                            self.log("Emoji exibido: " + emoji);
                        }
                        return;
                    }

                    if (topic.endsWith('/cmd/avatar/pose') && data) {
                        const pose = data.pose || data.name || "";
                        if (pose && self.head && self.head.poseTemplates && self.head.poseTemplates[pose]) {
                            self.head.setPoseFromTemplate(self.head.poseTemplates[pose]);
                            self.log("Pose definida: " + pose);
                        }
                        return;
                    }

                    if (topic.endsWith('/cmd/avatar/animation') && data) {
                        const url = data.url || "";
                        const duration = data.duration || 10;
                        if (url && self.head) {
                            self.head.playAnimation(url, null, duration);
                            // Redefine cameraView apos animacao para corrigir posicionamento
                            setTimeout(() => {
                                if (self.head && self.head.setView) {
                                    self.head.setView(self.config.cameraView || 'full', { cameraY: 0.5 });
                                }
                            }, 100);
                            self.log("Animacao executada: " + url);
                        }
                        return;
                    }
                }
                
                // Compat legado Hermes
                if (topic === 'hermes/tts/say') {
                    try {
                        const data = JSON.parse(message.toString());
                        self.log(`Texto recebido: "${data.text}"`);
                        
                        self.textStore.currentText = data.text || "";
                        if (data.siteId) {
                            self.textStore.siteTexts[data.siteId] = data.text;
                        }
                        
                        self.updateRecognizedText(data.text);
                        if (self.config.useSilentMode) {
                            self.speakSilent(data.text);
                        } else if (self.head) {
                            self.head.speakText(data.text, {
                                lipsyncLang: data.lang || self.config.language
                            });
                        }
                    } catch(e) {
                        self.log("Erro ao processar texto: " + e);
                    }
                } else if (topic.includes('/playBytes/') || topic.includes('/playWav/')) {
                    self.processMQTTAudio(message, topic);
                } else if (topic === 'hermes/asr/textCaptured') {
                    try {
                        const data = JSON.parse(message.toString());
                        self.log(`Texto capturado: "${data.text}"`);
                        self.updateRecognizedText(data.text);
                    } catch(e) {
                        self.log("Erro ao processar texto capturado: " + e);
                    }
                } else if (topic.startsWith('hermes/intent/')) {
                    try {
                        const data = JSON.parse(message.toString());
                        const intent = topic.split('/').pop();
                        self.log(`Intenção detectada: ${intent}`);
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
            
            // Se estamos no modo silencioso e temos texto, usamos apenas o texto
            if (this.config.useSilentMode && text) {
                this.speakSilent(text);
                return;
            }
            
            // Processa o áudio normalmente
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
                const audioDurationMs = Math.max(500, Math.round(audiobuffer.duration * 1000));
                let audioObj = {
                    audio: audiobuffer,
                    text: text,
                    duration: Math.max(2000, audioDurationMs)
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
                
                if (text) {
                    // Se temos texto, usamos o modo silencioso como fallback
                    this.speakSilent(text);
                } else {
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
            
            // Modo silencioso ou modo TTS normal
            if (this.config.useSilentMode) {
                this.speakSilent(text);
            } else {
                // Fala o texto usando o avatar com TTS
                this.head.speakText(text, {
                    lipsyncLang: options.language || this.config.language,
                    ...options
                });
            }
            
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
    
    extractSiteId: function(topic) {
        if (!topic) return null;
        const parts = topic.split("/");
        if (parts.length >= 4 && parts[0] === "neoalice" && parts[1] === "v1") {
            return parts[2];
        }
        return null;
    },
    
    matchesSite: function(siteId) {
        if (this.config.acceptAnySite) return true;
        if (!this.config.siteId) return true;
        if (!siteId) return true; // aceita broadcast
        return siteId === this.config.siteId;
    },
    
    topicMatchesMood: function(topic) {
        const moodTopic = this.config.moodTopic || "";
        if (!moodTopic) return false;
        if (moodTopic.includes("+")) {
            return topic.includes("evt/mood");
        }
        return topic === moodTopic;
    },

    mapMood: function(mood) {
        const normalized = (mood || "").toString().trim().toLowerCase();
        const moodMap = {
            // Estados do MoodProfile da NeoAlice e humores nativos do TalkingHead.
            // Mesma tabela do servico alice-companion (overcyber/airi,
            // services/alice-companion/src/mood-vocabulary.ts). Mudar nos dois lugares.
            "happy": "happy",
            "playful": "happy",
            "excited": "happy",
            "cozy": "happy",
            "mischief": "happy",
            "calm": "neutral",
            "neutral": "neutral",
            "reflective": "neutral",
            "sad": "sad",
            "melancholic": "sad",
            "annoyed": "angry",
            "angry": "angry",
            "grouchy": "angry",
            "tired": "sleep",
            "sleep": "sleep",
            "love": "love",
            "fear": "fear",
            "disgust": "disgust"
        };
        // hasOwnProperty evita que "constructor" ou "toString" virem humor.
        if (Object.prototype.hasOwnProperty.call(moodMap, normalized)) {
            return moodMap[normalized];
        }
        return "neutral";
    },
    
    applyMood: function(mood) {
        const mapped = this.mapMood(mood);
        this.currentMood = mapped;
        if (this.head && typeof this.head.setMood === 'function') {
            try {
                this.head.setMood(mapped);
            } catch (e) {
                this.log("Erro ao aplicar humor: " + e);
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
                    
                    if (this.head && this.avatar3DLoaded) {
                        if (this.config.useSilentMode) {
                            this.speakSilent(payload.message.text || "");
                        } else {
                            this.speakText(payload.message.text || "", {
                                siteId: payload.message.siteId,
                                language: payload.message.lang || this.config.language
                            });
                        }
                    }
                } else if (payload.topic && payload.topic.endsWith("/cmd/tts/say") && payload.message) {
                    this.updateRecognizedText(payload.message.text || "");
                    if (this.head && this.avatar3DLoaded) {
                        this.speakText(payload.message.text || "", {
                            siteId: payload.message.siteId,
                            language: payload.message.lang || this.config.language
                        });
                    }
                } else if (payload.topic && payload.topic.includes("/evt/stt/final") && payload.message) {
                    this.updateRecognizedText(payload.message.stt?.text || payload.message.text || "");
                }
                break;
                
            case "MQTT_AUDIO":
                this.log("Recebido áudio do node_helper: " + payload.topic);
                if (payload.text) {
                    this.textStore.currentText = payload.text || "";
                    if (payload.siteId) {
                        this.textStore.siteTexts[payload.siteId] = payload.text;
                    }
                    this.updateRecognizedText(payload.text || "");
                }
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

            case "MQTT_STOP":
                this.log("Parando fala (cmd.tts.stop)");
                if (this.head && typeof this.head.stopSpeaking === 'function') {
                    this.head.stopSpeaking();
                } else if (this.head && typeof this.head.pauseSpeaking === 'function') {
                    this.head.pauseSpeaking();
                }
                break;

            case "MQTT_MOOD":
                if (payload && payload.mood) {
                    this.log("Atualizando humor para " + payload.mood);
                    this.applyMood(payload.mood);
                }
                break;

            case "MQTT_GESTURE":
                if (payload && payload.gesture && this.head) {
                    this.head.playGesture(
                        payload.gesture,
                        payload.duration || 3,
                        payload.mirror || false,
                        payload.transition || 1000
                    );
                    this.log("Gesto via backend: " + payload.gesture);
                }
                break;

            case "MQTT_EMOJI":
                if (payload && payload.emoji && this.head) {
                    this.head.speakEmoji(payload.emoji);
                    this.log("Emoji via backend: " + payload.emoji);
                }
                break;

            case "MQTT_POSE":
                if (payload && payload.pose && this.head && this.head.poseTemplates && this.head.poseTemplates[payload.pose]) {
                    this.head.setPoseFromTemplate(this.head.poseTemplates[payload.pose]);
                    this.log("Pose via backend: " + payload.pose);
                }
                break;

            case "MQTT_ANIMATION":
                if (payload && payload.url && this.head) {
                    this.head.playAnimation(payload.url, null, payload.duration || 10);
                    // Redefine cameraView apos animacao para corrigir posicionamento
                    setTimeout(() => {
                        if (this.head && this.head.setView) {
                            this.head.setView(this.config.cameraView || 'full');
                        }
                    }, 500);
                    this.log("Animacao via backend: " + payload.url);
                }
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
