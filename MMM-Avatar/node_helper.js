/* Magic Mirror
 * Node Helper: MMM-Avatar
 * 
 * Compatível com MagicMirror v2.31.0
 */

const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
    // Inicialização
    start: function() {
        console.log("Iniciando node_helper para o módulo: " + this.name);
    },
    
    // Recebe notificações do módulo
    socketNotificationReceived: function(notification, payload) {
        if (notification === "AVATAR_LOG") {
            console.log(this.name + ": " + payload.message);
        }
    }
});
