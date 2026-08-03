/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

/* Punto de entrada del bundle (UMD). Agrega todas las clases públicas de la
 * librería bajo un único objeto `comdasuar`:
 *
 *   <script src="comdasuar.js"></script>   -> window.comdasuar.EmuladorComdasuar
 *   const comdasuar = require('emuladorcomdasuar');  -> comdasuar.EmuladorComdasuar
 *
 * Persistencia (Node.js) queda incluido, pero su dependencia `fs` se declara
 * externa: en el navegador se carga sin problema y solo falla si se usa. */

import {EmuladorComdasuar} from './EmuladorComdasuar.js';
import {AMSparser} from './AMSparser.js';
import {BancoDeSecuencias} from './BancoDeSecuencias.js';
import {SecuenciaAsuar} from './SecuenciaAsuar.js';
import {NotaAsuar} from './NotaAsuar.js';
import {Reproductor} from './Reproductor.js';
import {MIDIexport} from './MIDIexport.js';
import {AdministradorDeBancos} from './AdministradorDeBancos.js';
import {DiccionarioAsuar, getDiccionarioAsuar} from './diccionarioAsuar.js';
import {crearZip, crc32} from './zip.js';
import Heuristicos from './Heuristicos.js';
import Persistencia from './Persistencia.js';
import util from './util.js';
import {ResaltadorAMS} from './gui/ResaltadorAMS.js';

export default {
    EmuladorComdasuar,
    AMSparser,
    BancoDeSecuencias,
    SecuenciaAsuar,
    NotaAsuar,
    Reproductor,
    MIDIexport,
    AdministradorDeBancos,
    Heuristicos,
    DiccionarioAsuar,
    getDiccionarioAsuar,
    Persistencia,
    crearZip,
    crc32,
    ResaltadorAMS,
    DEBUG: util.DEBUG,
    setDebug: util.setDebug,
    log: util.log,
};
