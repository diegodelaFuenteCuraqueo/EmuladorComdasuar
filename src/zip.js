/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

/* Creador de archivos ZIP mínimo, sin dependencias y sin compresión.
 * Funciona tanto en el navegador (<script>) como en Node (require), ya que solo
 * manipula Uint8Array. Cada entrada se almacena con método 0 (sin comprimir),
 * lo que es suficiente para los archivos pequeños (MIDI, JSON) y evita depender
 * de una implementación de DEFLATE en el navegador.
 *
 * Formato (APPNOTE 6.3.4): cabecera local + datos por entrada, seguidos de un
 * directorio central y del registro de fin de directorio central (EOCD).
 */

/** Tabla CRC-32 (polinomio reflejado 0xEDB88320). Se calcula una sola vez. */
const CRC_TABLA = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++){
        let c = n;
        for (let k = 0; k < 8; k++){
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        t[n] = c >>> 0;
    }
    return t;
})();

/** CRC-32 de una secuencia de bytes.
 *  @param {Uint8Array} bytes
 *  @returns {number} CRC-32 (entero sin signo). */
function crc32(bytes){
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++){
        crc = CRC_TABLA[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/** Hora/fecha DOS a partir de la fecha actual (para las cabeceras ZIP). */
function fechaDOS(){
    const d = new Date();
    const hora = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
    const fecha = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    return {hora, fecha};
}

/** Añade un entero little-endian de 2 o 4 bytes a un arreglo de bytes. */
function pushU16(bytes, v){
    bytes.push(v & 0xFF, (v >>> 8) & 0xFF);
}
function pushU32(bytes, v){
    bytes.push(
        v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF
    );
}

/** Bytes UTF-8 de un nombre de entrada (nombres ASCII normalmente).
 *  Usa TextEncoder si está disponible; si no, codifica UTF-8 a mano. */
function nombreBytes(nombre){
    const s = String(nombre);
    if (typeof TextEncoder !== "undefined"){
        return new TextEncoder().encode(s);
    }
    const bytes = [];
    for (let i = 0; i < s.length; i++){
        const c = s.codePointAt(i);
        if (c < 0x80) bytes.push(c);
        else if (c < 0x800) bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
        else if (c < 0x10000) bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
        else bytes.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 0x3F), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
    return new Uint8Array(bytes);
}

/**
 * Crea un archivo ZIP (sin comprimir) a partir de una lista de entradas.
 * @param {Array<{nombre: string, bytes: Uint8Array|Array<number>}>} entradas
 * @returns {Uint8Array} Archivo ZIP completo. */
function crearZip(entradas){
    const {hora, fecha} = fechaDOS();
    const archivo = [];
    const central = [];

    for (const entrada of entradas){
        const nombre = nombreBytes(entrada.nombre);
        const datos = entrada.bytes instanceof Uint8Array
            ? entrada.bytes
            : new Uint8Array(entrada.bytes);
        const checksum = crc32(datos);

        // Cabecera local
        const localPos = archivo.length;
        archivo.push(0x50, 0x4B, 0x03, 0x04);            // firma PK\x03\x04
        pushU16(archivo, 20);                            // versión necesaria
        pushU16(archivo, 0);                             // flags
        pushU16(archivo, 0);                             // método: 0 = sin comprimir
        pushU16(archivo, hora);
        pushU16(archivo, fecha);
        pushU32(archivo, checksum);
        pushU32(archivo, datos.length);                  // tamaño comprimido
        pushU32(archivo, datos.length);                  // tamaño original
        pushU16(archivo, nombre.length);
        pushU16(archivo, 0);                             // longitud extra
        for (let i = 0; i < nombre.length; i++) archivo.push(nombre[i]);
        for (let i = 0; i < datos.length; i++) archivo.push(datos[i]);

        // Directorio central
        central.push(0x50, 0x4B, 0x01, 0x02);            // firma PK\x01\x02
        pushU16(central, 20);                            // versión creado por (DOS)
        pushU16(central, 20);                            // versión necesaria
        pushU16(central, 0);                             // flags
        pushU16(central, 0);                             // método
        pushU16(central, hora);
        pushU16(central, fecha);
        pushU32(central, checksum);
        pushU32(central, datos.length);
        pushU32(central, datos.length);
        pushU16(central, nombre.length);
        pushU16(central, 0);                             // longitud extra
        pushU16(central, 0);                             // comentario
        pushU16(central, 0);                             // disco inicial
        pushU16(central, 0);                             // atributos internos
        pushU32(central, 0);                             // atributos externos
        pushU32(central, localPos);                      // offset cabecera local
        for (let i = 0; i < nombre.length; i++) central.push(nombre[i]);
    }

    const cdOffset = archivo.length;

    // Fin de directorio central (EOCD): va siempre al final del archivo.
    const eocd = [];
    eocd.push(0x50, 0x4B, 0x05, 0x06);                 // firma PK\x05\x06
    pushU16(eocd, 0);                                  // nº de disco
    pushU16(eocd, 0);                                  // disco con el directorio
    pushU16(eocd, entradas.length);                    // entradas en este disco
    pushU16(eocd, entradas.length);                    // total de entradas
    pushU32(eocd, central.length);                     // tamaño del directorio central
    pushU32(eocd, cdOffset);                           // offset del directorio central
    pushU16(eocd, 0);                                  // longitud del comentario

    return new Uint8Array([...archivo, ...central, ...eocd]);
}

exports.crearZip = crearZip;
exports.crc32 = crc32;
