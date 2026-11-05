/* MagicMirror
 * Module: MMM-AiriStage
 *
 * Mostra o palco do AIRI (fork overcyber/airi) num iframe, em tela cheia ou numa regiao.
 * O AIRI roda como build local (VITE_AIRI_OFFLINE=true) num servidor estatico da propria maquina,
 * entao o modulo funciona sem internet. A conversa e o avatar chegam pela ponte NeoAlice do AIRI.
 *
 * Por Overcyber. MIT Licensed.
 */

Module.register("MMM-AiriStage", {
    defaults: {
        // Pagina /mirror do AIRI: so o avatar, fundo transparente, sem chat (Plano 06, F3).
        // Com o Docker do AIRI em outra maquina, use https://<ip>:4443/mirror e instale a CA local.
        url: "http://localhost:4173/mirror",
        width: "100vw",
        height: "100vh",
        // Permissoes do iframe: audio sem clique e microfone para a fala do usuario.
        allow: "autoplay; microphone",
        // Fundo transparente, para o espelho continuar escuro em volta do avatar.
        transparent: true
    },

    getStyles: function() {
        return ["MMM-AiriStage.css"];
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "airi-stage";
        wrapper.style.width = this.config.width;
        wrapper.style.height = this.config.height;

        const frame = document.createElement("iframe");
        frame.className = "airi-stage-frame";
        frame.src = this.config.url;
        frame.setAttribute("allow", this.config.allow);
        frame.setAttribute("title", "AIRI");
        if (this.config.transparent) {
            frame.setAttribute("allowtransparency", "true");
            frame.style.background = "transparent";
        }
        wrapper.appendChild(frame);
        return wrapper;
    }
});
