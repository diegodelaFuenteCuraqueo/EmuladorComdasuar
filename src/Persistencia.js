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
}

module.exports = Persistencia;
