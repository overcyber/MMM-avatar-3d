/* Magic Mirror
 * Module: MMM-Avatar
 * 
 * Compatível com MagicMirror v2.31.0
 */

Module.register("MMM-Avatar", {
    // Configurações padrão
    defaults: {
        MQTT_BROKER_WS: 'ws://192.168.10.21:1884',
        MQTT_CLIENT_ID: "EVA_MQTT_" + Math.random().toString(16).substr(2, 8),
        OPENAI_API_KEY: "", // Substitua pela sua chave (opcional)
        avatarModelPath: "https://models.readyplayer.me/66d21fb928192d6953bf8712.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png",
        width: "600px",
        height: "600px",
        debug: true,
        sandbox: true    // Usar um iframe com sandbox para isolamento
    },

    // Carregar recursos
    getStyles: function() {
        return ["MMM-Avatar.css"];
    },

    // Carregar scripts
    getScripts: function() {
        return [];
    },

    // Inicializar o módulo
    start: function() {
        Log.info("Iniciando módulo: " + this.name);
        this.isLoaded = false;
        this.message = "Inicializando...";
        this.sandboxInitialized = false;
    },

    // Renderizar o DOM
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "avatar-wrapper";
        wrapper.style.width = this.config.width;
        wrapper.style.height = this.config.height;
        wrapper.style.backgroundColor = "#000000";
        wrapper.style.position = "relative";
        wrapper.style.overflow = "hidden";
        wrapper.style.borderRadius = "10px";
        
        if (this.message) {
            // Mostrar mensagem atual
            const messageDiv = document.createElement("div");
            messageDiv.className = "avatar-message";
            messageDiv.innerHTML = this.message;
            wrapper.appendChild(messageDiv);
        }
        
        if (!this.isLoaded) {
            // Ainda não carregou, mostrar apenas a mensagem
            return wrapper;
        }
        
        // Criar o sandbox (iframe) para o avatar
        if (this.config.sandbox && !this.sandboxInitialized) {
            // Preparar e injetar o sandbox
            const sandboxContainer = document.createElement("div");
            sandboxContainer.className = "sandbox-container";
            sandboxContainer.style.width = "100%";
            sandboxContainer.style.height = "100%";
            sandboxContainer.style.position = "absolute";
            sandboxContainer.style.top = "0";
            sandboxContainer.style.left = "0";
            
            const sandbox = document.createElement("iframe");
            sandbox.id = "avatar-sandbox";
            sandbox.className = "avatar-sandbox";
            sandbox.style.width = "100%";
            sandbox.style.height = "100%";
            sandbox.style.border = "none";
            sandbox.style.backgroundColor = "#000000";
            // Permitir WebGL, scripts e acesso a APIs necessárias
            sandbox.setAttribute("sandbox", "allow-scripts allow-same-origin");
            sandbox.setAttribute("allow", "autoplay; camera; microphone");
            
            // Conteúdo HTML completo para o iframe
            const htmlContent = this.generateSandboxHTML();
            
            // Usar srcdoc para injetar o conteúdo HTML completo
            sandbox.srcdoc = htmlContent;
            
            // Ouvir mensagens do iframe
            window.addEventListener("message", (event) => {
                if (event.data && event.data.type === "avatar-message") {
                    this.updateMessage(event.data.text);
                } else if (event.data && event.data.type === "avatar-log") {
                    Log.info(this.name + ": " + event.data.text);
                } else if (event.data && event.data.type === "avatar-ready") {
                    this.sandboxInitialized = true;
                }
            });
            
            sandboxContainer.appendChild(sandbox);
            wrapper.appendChild(sandboxContainer);
        }
        
        // Área de texto reconhecido (externa ao sandbox)
        const recognizedTextDiv = document.createElement("div");
        recognizedTextDiv.id = "recognized-text";
        recognizedTextDiv.className = "recognized-text";
        recognizedTextDiv.innerHTML = "Texto reconhecido aparecerá aqui.";
        wrapper.appendChild(recognizedTextDiv);
        
        return wrapper;
    },
    
    // Gerar o HTML completo para o sandbox
    generateSandboxHTML: function() {
        return `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Avatar MQTT</title>
            <style>
                body, html {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    background-color: #000000;
                    color: white;
                    overflow: hidden;
                    font-family: Arial, sans-serif;
                }
                #avatar {
                    display: block;
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 50px;
                }
                #loading {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-family: Arial, sans-serif;
                    font-size: 18px;
                    color: white;
                    background-color: rgba(0,0,0,0.7);
                    padding: 10px 20px;
                    border-radius: 5px;
                    z-index: 100;
                }
                #debug {
                    position: absolute;
                    bottom: 60px;
                    left: 10px;
                    right: 10px;
                    max-height: 150px;
                    overflow-y: auto;
                    background-color: rgba(0,0,0,0.8);
                    color: #0f0;
                    font-family: monospace;
                    font-size: 12px;
                    padding: 5px;
                    z-index: 90;
                    display: ${this.config.debug ? 'block' : 'none'};
                }
                #recognizedText {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 50px;
                    background-color: rgba(0,0,0,0.8);
                    color: white;
                    font-size: 16px;
                    line-height: 50px;
                    text-align: center;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    padding: 0 10px;
                    box-sizing: border-box;
                    z-index: 80;
                }
            </style>
        </head>
        <body>
            <div id="avatar"></div>
            <div id="loading">Carregando Avatar...</div>
            <div id="debug"></div>
            <div id="recognizedText">Texto reconhecido aparecerá aqui.</div>
            
            <!-- Script para MQTT -->
            <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
            
            <!-- Configuração para importação de módulos -->
            <script type="importmap">
            {
                "imports": {
                    "three": "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js/+esm",
                    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/",
                    "talkinghead": "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.2/modules/talkinghead.mjs"
                }
            }
            </script>
            
            <!-- Script principal para o avatar -->
            <script type="module">
                import { TalkingHead } from "talkinghead";
                
                // Função para enviar mensagens para o módulo principal
                function sendMessage(type, text) {
                    window.parent.postMessage({ type: type, text: text }, "*");
                }
                
                // Função de log
                function log(msg) {
                    console.log(msg);
                    sendMessage("avatar-log", msg);
                    
                    const debugEl = document.getElementById('debug');
                    if (debugEl) {
                        const time = new Date().toLocaleTimeString();
                        const entry = document.createElement('div');
                        entry.textContent = \`[\${time}] \${msg}\`;
                        debugEl.appendChild(entry);
                        debugEl.scrollTop = debugEl.scrollHeight;
                        
                        // Manter apenas as últimas 100 mensagens
                        while (debugEl.childNodes.length > 100) {
                            debugEl.removeChild(debugEl.firstChild);
                        }
                    }
                }
                
                // Variáveis globais
                let head = null;
                let mqttClient = null;
                let textStore = {
                    currentText: "",
                    siteTexts: {}
                };
                
                // Configurações
                const CONFIG = {
                    MQTT_BROKER_WS: '${this.config.MQTT_BROKER_WS}',
                    MQTT_CLIENT_ID: '${this.config.MQTT_CLIENT_ID}',
                    OPENAI_API_KEY: '${this.config.OPENAI_API_KEY}',
                    avatarModelPath: '${this.config.avatarModelPath}'
                };
                
                // Processa áudio MQTT
                async function processMQTTAudio(rawData, topic) {
                    try {
                        log(\`Áudio MQTT recebido no tópico: \${topic}\`);
                        
                        // Obtém o texto para o site ID
                        let text = "";
                        const parts = topic.split('/');
                        if (parts.length >= 3) {
                            const siteId = parts[2];
                            text = textStore.siteTexts[siteId] || textStore.currentText || "";
                        }
                        
                        // Prepara o áudio
                        const rawBuffer = new Uint8Array(rawData);
                        let arraybuffer = rawBuffer.buffer;
                        
                        try {
                            log("Decodificando áudio...");
                            let audiobuffer = await head.audioCtx.decodeAudioData(arraybuffer);
                            
                            // Cria objeto de áudio
                            let audioObj = {
                                audio: audiobuffer,
                                text: text,
                                duration: Math.max(2000, text.length * 80)
                            };
                            
                            // Adiciona palavras para sincronização
                            if (text) {
                                const words = text.split(/\\s+/);
                                if (words.length > 0) {
                                    audioObj.words = words;
                                    audioObj.wtimes = [];
                                    audioObj.wdurations = [];
                                    
                                    // Distribui palavras no tempo
                                    const timePerWord = audioObj.duration / words.length;
                                    words.forEach((word, i) => {
                                        audioObj.wtimes.push(i * timePerWord);
                                        audioObj.wdurations.push(timePerWord * 0.8);
                                    });
                                }
                            }
                            
                            // Reproduz o áudio
                            head.speakAudio(audioObj);
                            log("✓ Áudio MQTT reproduzido com sucesso");
                            
                        } catch (decodeError) {
                            log("Erro ao decodificar áudio, tentando método alternativo...");
                            
                            // Alternativa para áudio não decodificável
                            const dummyBuffer = new AudioBuffer({
                                length: 22050,
                                numberOfChannels: 1,
                                sampleRate: 22050
                            });
                            
                            head.speakAudio({
                                audio: dummyBuffer,
                                text: text,
                                duration: Math.max(2000, text.length * 80)
                            });
                            
                            log("⚠️ Usado método alternativo para reprodução");
                        }
                        
                    } catch (e) {
                        log("ERRO ao processar áudio MQTT: " + e);
                    }
                }
                
                // Inicializa MQTT
                function initMQTT() {
                    log("Conectando ao broker MQTT: " + CONFIG.MQTT_BROKER_WS);
                    
                    mqttClient = mqtt.connect(CONFIG.MQTT_BROKER_WS, { 
                        clientId: CONFIG.MQTT_CLIENT_ID,
                        clean: true,
                        reconnectPeriod: 5000
                    });
                    
                    mqttClient.on('connect', () => {
                        log("✓ Conectado ao broker MQTT");
                        
                        // Inscreve nos tópicos
                        mqttClient.subscribe('hermes/#', (err) => {
                            if (!err) log("✓ Inscrito em hermes/#");
                            else log("✗ Erro ao inscrever em hermes/#: " + err);
                        });
                    });
                    
                    mqttClient.on('error', (err) => {
                        log("ERRO MQTT: " + err);
                    });
                    
                    mqttClient.on('message', (topic, message) => {
                        log(\`Mensagem recebida no tópico: \${topic}\`);
                        
                        // Texto de TTS
                        if (topic === 'hermes/tts/say') {
                            try {
                                const data = JSON.parse(message.toString());
                                log(\`Texto recebido: "\${data.text}"\`);
                                
                                // Atualiza textos
                                textStore.currentText = data.text || "";
                                if (data.siteId) {
                                    textStore.siteTexts[data.siteId] = data.text;
                                }
                                
                                // Atualiza interface
                                const textEl = document.getElementById('recognizedText');
                                if (textEl) {
                                    textEl.textContent = data.text;
                                }
                                
                                // Envia para o módulo principal
                                sendMessage("avatar-message", data.text);
                            } catch(e) {
                                log("Erro ao processar texto: " + e);
                            }
                        }
                        
                        // Áudio
                        else if (topic.includes('/playBytes/') || topic.includes('/playWav/')) {
                            processMQTTAudio(message, topic);
                        }
                        
                        // Texto reconhecido
                        else if (topic === 'hermes/asr/textCaptured') {
                            try {
                                const data = JSON.parse(message.toString());
                                log(\`Texto capturado: "\${data.text}"\`);
                                
                                const textEl = document.getElementById('recognizedText');
                                if (textEl) {
                                    textEl.textContent = data.text;
                                }
                                
                                sendMessage("avatar-message", data.text);
                            } catch(e) {
                                log("Erro ao processar texto capturado: " + e);
                            }
                        }
                    });
                }
                
                // Inicialização principal
                async function init() {
                    log("Iniciando aplicação...");
                    sendMessage("avatar-message", "Iniciando aplicação...");
                    
                    try {
                        const nodeAvatar = document.getElementById('avatar');
                        const nodeLoading = document.getElementById('loading');
                        
                        // Criar instância do TalkingHead
                        log("Criando TalkingHead...");
                        head = new TalkingHead(nodeAvatar, {
                            ttsEndpoint: "",  // Sem API externa
                            lipsyncModules: ["pt-br", "pt", "en"],
                            cameraView: "full"
                        });
                        
                        // Carregar e mostrar avatar
                        log("Carregando avatar: " + CONFIG.avatarModelPath);
                        sendMessage("avatar-message", "Carregando avatar...");
                        
                        await head.showAvatar({
                            url: CONFIG.avatarModelPath,
                            body: 'F',
                            avatarMood: 'happy',
                            lipsyncLang: 'pt-br'
                        }, (ev) => {
                            if (ev.lengthComputable && nodeLoading) {
                                const percent = Math.min(100, Math.round((ev.loaded / ev.total) * 100));
                                nodeLoading.textContent = \`Carregando Avatar: \${percent}%\`;
                                sendMessage("avatar-message", \`Carregando Avatar: \${percent}%\`);
                            }
                        });
                        
                        if (nodeLoading) {
                            nodeLoading.style.display = 'none';
                        }
                        
                        log("✓ Avatar carregado com sucesso!");
                        sendMessage("avatar-message", "Avatar carregado com sucesso!");

                        // Inicializar MQTT
                        initMQTT();
                        
                        // Teste inicial
                        setTimeout(() => {
                            head.speakText("Olá, estou pronta para processar áudio em português brasileiro", {
                                lipsyncLang: "pt-br"
                            });
                        }, 2000);
                        
                        // Informar que está pronto
                        sendMessage("avatar-ready", true);
                        
                    } catch (error) {
                        log("ERRO ao inicializar: " + error);
                        sendMessage("avatar-message", "Erro ao inicializar: " + error);
                        
                        const nodeLoading = document.getElementById('loading');
                        if (nodeLoading) {
                            nodeLoading.textContent = \`Erro: \${error}\`;
                            nodeLoading.style.color = "red";
                        }
                    }
                }
                
                // Iniciar após um pequeno atraso
                setTimeout(init, 500);
            </script>
        </body>
        </html>
        `;
    },
    
    // Atualizar a mensagem exibida
    updateMessage: function(text) {
        this.message = text;
        const textEl = document.getElementById("recognized-text");
        if (textEl) {
            textEl.innerHTML = text;
        }
        this.updateDom();
    },
    
    // Notificações do sistema
    notificationReceived: function(notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
            // Módulo está pronto para carregar
            this.isLoaded = true;
            this.updateDom();
        }
    }
});
