/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

const fs = require('fs');

/** Adaptador de persistencia (solo Node.js).
 *  Lee y escribe archivos JSON con los bancos desde/hacia un AdministradorDeBancos.
 *  El núcleo de la librería no depende de este módulo para funcionar en el navegador. */
class Persistencia {

    /** @param {import('./AdministradorDeBancos.js').AdministradorDeBancos} admin Administrador de bancos a cargar.
     *  @param {string} ruta Ruta del archivo JSON con los bancos. */
    static cargarAdmin(admin, ruta){
        let texto = "";
        try {
            texto = fs.readFileSync(ruta, 'utf8');
        } catch (err) {
            console.error(err);
            return;
        }
        admin.cargarJSON(texto);
    }

    /** @param {import('./AdministradorDeBancos.js').AdministradorDeBancos} admin Administrador de bancos a guardar.
     *  @param {string} ruta Ruta del archivo JSON donde se guardarán los bancos. */
    static guardarAdmin(admin, ruta){
        let JSONout = admin.exportarJSON();
        try {
            fs.writeFileSync(ruta, JSONout);
        } catch (err) {
            console.error(err);
        }
    }

    /** Guarda un archivo MIDI en disco (resultado de MIDIexport.bancos2mid).
     *  @param {Uint8Array|Array<number>} bytes Bytes del archivo SMF.
     *  @param {string} ruta Ruta del archivo .mid de salida. */
    static guardarMIDI(bytes, ruta){
        Persistencia.guardarArchivo(bytes, ruta);
    }

    /** Guarda un archivo ZIP en disco (resultado de MIDIexport.bancos2zip).
     *  @param {Uint8Array|Array<number>} bytes Bytes del archivo ZIP.
     *  @param {string} ruta Ruta del archivo .zip de salida. */
    static guardarZIP(bytes, ruta){
        Persistencia.guardarArchivo(bytes, ruta);
    }

    /** Guarda cualquier arreglo de bytes en disco.
     *  @param {Uint8Array|Array<number>} bytes
     *  @param {string} ruta Ruta del archivo de salida. */
    static guardarArchivo(bytes, ruta){
        const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        try {
            fs.writeFileSync(ruta, data);
        } catch (err) {
            console.error(err);
        }
    }
}

module.exports = Persistencia;
