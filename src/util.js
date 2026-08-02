/** Utilidades de depuración para la librería COMDASUAR.
 *  Los logs internos de la librería solo se imprimen si la depuración está activada. */
const DEBUG = { enabled: false };

/** Activa o desactiva los logs de depuración internos.
 * @param {boolean} on true para imprimir logs de depuración. */
function setDebug(on) {
    DEBUG.enabled = !!on;
}

/** Log de depuración. Solo imprime si la depuración está activada. */
function log(...args) {
    if (DEBUG.enabled) console.log(...args);
}

module.exports = { DEBUG, setDebug, log };
