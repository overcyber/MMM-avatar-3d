// AvatarController - Sistema Independente
// Extrai logica do MMM-AvatarMQTT.js para funcionar sem MagicMirror

import { TalkingHead } from 'talkinghead';

export class AvatarController {
    constructor(config) {
        this.config = config;
        this.head = null;
        this.audioCtx = null;
        this.currentMood = 'happy';
        this.textStore = {
            currentText: '',
            siteTexts: {}
        };
    }

    async init() {
        const container = document.getElementById('avatar-container');
        const loadingText = document.getElementById('loading-text');
        const loadingDiv = document.getElementById('loading');

        // Inicializar AudioContext
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Import TalkingHead dinamicamente
        const { default: TalkingHeadModule } = await import('talkinghead');

        // Criar instancia TalkingHead (MESMA configuracao do MagicMirror)
        this.head = new TalkingHeadModule(container, {
            ttsEndpoint: '',
            lipsyncModules: ['pt-br', 'pt', 'en'],
            cameraView: this.config.cameraView || 'full'
        });

        // Callback de progresso
        const progressCallback = (ev) => {
            if (ev.lengthComputable && loadingText) {
                const percent = Math.min(100, Math.round((ev.loaded / ev.total) * 100));
                loadingText.textContent = `Carregando ${percent}%`;
            }
        };

        // Carregar avatar (MESMO URL do MagicMirror)
        await this.head.showAvatar({
            url: this.config.avatarURL,
            body: 'F',
            avatarMood: this.currentMood,
            lipsyncLang: this.config.language
        }, progressCallback);

        // Esconder loading
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }

        // Atualizar status
        this.updateStatus('avatar', 'ready', 'Pronto');

        // Aplicar mood inicial
        this.applyMood(this.currentMood);

        window.log('Avatar carregado com sucesso!');
    }

    speakText(text, lang) {
        if (!this.head) return;

        this.textStore.currentText = text;
        this.updateRecognizedText(text);

        // Resume AudioContext se suspenso
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // MESMA logica do MagicMirror - MMM-AvatarMQTT.js linha 516
        this.head.speakText(text, {
            lipsyncLang: lang || this.config.language
        });

        window.log(`Falando: "${text}"`);
    }

    async speakAudio(audioBase64, text) {
        if (!this.head || !this.audioCtx) return;

        try {
            // Resume AudioContext
            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
            }

            // Decodificar base64
            const binary = atob(audioBase64);
            const arr = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                arr[i] = binary.charCodeAt(i);
            }

            // Decodificar audio
            const arrayBuffer = arr.buffer;
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

            // Criar objeto de audio (MESMA logica do MagicMirror)
            const audioDurationMs = Math.max(500, Math.round(audioBuffer.duration * 1000));
            const audioObj = {
                audio: audioBuffer,
                text: text || this.textStore.currentText || '',
                duration: Math.max(2000, audioDurationMs)
            };

            // Adicionar sincronizacao labial se tiver texto
            if (audioObj.text) {
                const words = audioObj.text.split(/\s+/);
                if (words.length > 0) {
                    audioObj.words = words;
                    audioObj.wtimes = [];
                    audioObj.wdurations = [];

                    const timePerWord = audioObj.duration / words.length;
                    words.forEach((word, i) => {
                        audioObj.wtimes.push(i * timePerWord);
                        audioObj.wdurations.push(timePerWord * 0.8);
                    });
                }
            }

            // Reproduzir
            this.head.speakAudio(audioObj);
            window.log('Audio reproduzido com sucesso');

        } catch (error) {
            window.log('ERRO ao processar audio: ' + error);
        }
    }

    stopSpeaking() {
        if (this.head) {
            if (typeof this.head.stopSpeaking === 'function') {
                this.head.stopSpeaking();
            } else if (typeof this.head.pauseSpeaking === 'function') {
                this.head.pauseSpeaking();
            }
        }
    }

    setMood(mood) {
        this.currentMood = this.mapMood(mood);
        if (this.head && typeof this.head.setMood === 'function') {
            try {
                this.head.setMood(this.currentMood);
                window.log(`Mood definido: ${this.currentMood}`);
            } catch (e) {
                window.log('Erro ao aplicar mood: ' + e);
            }
        }
    }

    playGesture(gesture, duration, mirror, transition) {
        if (this.head) {
            this.head.playGesture(
                gesture,
                duration || 3,
                mirror || false,
                transition || 1000
            );
            window.log(`Gesto: ${gesture}`);
        }
    }

    speakEmoji(emoji) {
        if (this.head) {
            this.head.speakEmoji(emoji);
            window.log(`Emoji: ${emoji}`);
        }
    }

    setPose(pose) {
        if (this.head && this.head.poseTemplates && this.head.poseTemplates[pose]) {
            this.head.setPoseFromTemplate(this.head.poseTemplates[pose]);
            window.log(`Pose: ${pose}`);
        }
    }

    playAnimation(url, duration) {
        if (this.head) {
            this.head.playAnimation(url, null, duration || 10);

            // Redefinir cameraView apos animacao (MESMO comportamento do MagicMirror)
            setTimeout(() => {
                if (this.head && this.head.setView) {
                    this.head.setView(this.config.cameraView || 'full', { cameraY: 0.5 });
                }
            }, 100);

            window.log(`Animacao: ${url}`);
        }
    }

    applyMood(mood) {
        const mapped = this.mapMood(mood);
        this.currentMood = mapped;
        if (this.head && typeof this.head.setMood === 'function') {
            try {
                this.head.setMood(mapped);
            } catch (e) {
                window.log('Erro ao aplicar humor: ' + e);
            }
        }
    }

    mapMood(mood) {
        // MESMO mapeamento do MagicMirror - MMM-AvatarMQTT.js linha 846-861
        const normalized = (mood || '').toString().toLowerCase();
        const moodMap = {
            'happy': 'happy',
            'playful': 'happy',
            'excited': 'happy',
            'sad': 'sad',
            'annoyed': 'angry',
            'angry': 'angry',
            'tired': 'sleep',
            'sleep': 'sleep',
            'calm': 'neutral',
            'neutral': 'neutral'
        };
        return moodMap[normalized] || 'neutral';
    }

    updateRecognizedText(text) {
        this.textStore.currentText = text;
        // Podemos exibir em algum elemento da UI se necessario
    }

    updateStatus(type, state, text) {
        const statusText = document.getElementById(`${type}-status-text`);
        const statusDot = statusText?.previousElementSibling;

        if (statusText) {
            statusText.textContent = text;
        }

        if (statusDot) {
            statusDot.className = `status-dot ${state}`;
        }
    }
}
