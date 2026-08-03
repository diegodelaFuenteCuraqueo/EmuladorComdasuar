/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

/* Servidor de desarrollo SIN dependencias (solo node:http).
 * Sirve el banco de pruebas (test/manual.html + bundle) y una API JSON para
 * probar el parseo, las heurísticas y la exportación MIDI desde la terminal o curl.
 *
 *   npm run dev
 *   GET  /                             -> test/manual.html
 *   GET  /comdasuar.browser.js         -> bundle del navegador
 *   GET  /api/scores                   -> { scores: [nombres] }
 *   GET  /api/scores/:nombre           -> { nombre, ams }
 *   GET  /api/scores/:nombre/midi      -> archivo .mid (una secuencia)
 *   POST /api/sequence   { ams }       -> datos de la secuencia compilada
 *   POST /api/heuristic  { ams, op, params?, amsB? } -> secuencia transformada
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const {EmuladorComdasuar} = require('../src/EmuladorComdasuar.js');
const {BancoDeSecuencias} = require('../src/BancoDeSecuencias.js');
const {MIDIexport} = require('../src/MIDIexport.js');
const Heuristicos = require('../src/Heuristicos.js');

EmuladorComdasuar.setDebug(false);

const PUERTO = process.env.PORT || 3000;

const RAIZ = path.join(__dirname, '..');
const DIR_SCORES = path.join(RAIZ, 'test', 'scores');
const ARCHIVO_MANUAL = path.join(RAIZ, 'test', 'manual.html');
const ARCHIVO_BUNDLE = path.join(RAIZ, 'test', 'comdasuar.browser.js');

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.mid': 'audio/midi',
};

// - - - utilidades - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

function responderJSON(res, codigo, objeto){
    const body = JSON.stringify(objeto);
    res.writeHead(codigo, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(body);
}

function responderArchivo(res, ruta, contentDisposition){
    fs.readFile(ruta, (err, data) => {
        if (err){
            responderJSON(res, 404, {error: 'no encontrado'});
            return;
        }
        const headers = {'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream'};
        if (contentDisposition) headers['Content-Disposition'] = contentDisposition;
        res.writeHead(200, headers);
        res.end(data);
    });
}

function leerBody(req){
    return new Promise((resolve, reject) => {
        let acumulado = '';
        req.on('data', (chunk) => {
            acumulado += chunk;
            if (acumulado.length > 1024 * 1024){
                req.destroy();
                reject(new Error('cuerpo demasiado grande'));
            }
        });
        req.on('end', () => {
            try { resolve(acumulado ? JSON.parse(acumulado) : {}); }
            catch (e) { reject(new Error('JSON inválido')); }
        });
        req.on('error', reject);
    });
}

/** Nombre de partitura seguro: solo el basename, sin escaparse del directorio. */
function nombreSeguro(nombre){
    const base = path.basename(String(nombre || ''));
    if (base !== nombre || !/^[\w().=-]+$/.test(base)) return null;
    return base;
}

function listarScores(){
    try {
        return fs.readdirSync(DIR_SCORES)
            .filter((f) => f.toLowerCase().endsWith('.txt'))
            .sort();
    } catch (e) {
        return [];
    }
}

function datosSeq(seq){
    return {
        nombre: seq.getNombre(),
        tempo: seq.getTempo(),
        notas: seq.getNotas().length,
        midicents: seq.getMidicents(),
        duraciones: seq.getDuraciones(),
        inicios: seq.getInicios(),
        duracionTotal: seq.getDuracionTotal(),
        bach: {
            alturas: seq.getBachMidicents(),
            inicios: seq.getBachInicios(),
            duraciones: seq.getBachDuraciones(),
        },
    };
}

function aplicarHeuristica(seq, op, params){
    switch (op){
        case 'transportar':      Heuristicos.transportar(seq, params[0]); break;
        case 'invertir':         Heuristicos.invertir(seq, params[0]); break;
        case 'retrogradarAlturas':    Heuristicos.retrogradarAlturas(seq); break;
        case 'retrogradarDuraciones': Heuristicos.retrogradarDuraciones(seq); break;
        case 'desordenarAlturas':     Heuristicos.desordenarAlturas(seq); break;
        case 'desordenarDuraciones':  Heuristicos.desordenarDuraciones(seq); break;
        case 'expandirAlturas':   Heuristicos.expandirAlturas(seq, params[0], params[1]); break;
        case 'expandirDuraciones': Heuristicos.expandirDuraciones(seq, params[0]); break;
        default: return null;
    }
    return seq;
}

// - - - rutas - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const ruta = decodeURIComponent(url.pathname);

    try {
        // Archivos estáticos --------------------------------------------------
        if (ruta === '/' || ruta === '/index.html'){
            return responderArchivo(res, ARCHIVO_MANUAL);
        }
        if (ruta === '/comdasuar.browser.js'){
            return responderArchivo(res, ARCHIVO_BUNDLE);
        }

        // API: listado de partituras -----------------------------------------
        if (ruta === '/api/scores' && req.method === 'GET'){
            return responderJSON(res, 200, {scores: listarScores()});
        }

        // API: partitura individual y su MIDI ---------------------------------
        const matchScoreMidi = ruta.match(/^\/api\/scores\/([\w().=-]+)\/midi$/);
        const matchScore = ruta.match(/^\/api\/scores\/([\w().=-]+)$/);
        const nombreArchivo = (matchScore && matchScore[1]) || (matchScoreMidi && matchScoreMidi[1]);

        if (nombreArchivo && req.method === 'GET'){
            if (nombreSeguro(nombreArchivo) !== nombreArchivo || !fs.existsSync(path.join(DIR_SCORES, nombreArchivo))){
                return responderJSON(res, 404, {error: 'partitura no encontrada'});
            }
            if (matchScoreMidi){
                const seq = BancoDeSecuencias.secuenciaDesdeAMS(
                    fs.readFileSync(path.join(DIR_SCORES, nombreArchivo), 'utf8')
                );
                seq.setNombre(nombreArchivo.replace(/\.txt$/, ''));
                const bytes = MIDIexport.secuencia2mid(seq);
                const headers = {'Content-Type': 'audio/midi',
                    'Content-Disposition': `attachment; filename="${nombreArchivo.replace(/\.txt$/, '')}.mid"`};
                res.writeHead(200, headers);
                return res.end(bytes);
            }
            if (matchScore){
                const ams = fs.readFileSync(path.join(DIR_SCORES, nombreArchivo), 'utf8');
                return responderJSON(res, 200, {nombre: nombreArchivo, ams});
            }
        }

        // API: compilar una partitura -----------------------------------------
        if (ruta === '/api/sequence' && req.method === 'POST'){
            const body = await leerBody(req);
            if (!body.ams){
                return responderJSON(res, 400, {error: 'falta el campo ams'});
            }
            const seq = BancoDeSecuencias.secuenciaDesdeAMS(body.ams);
            return responderJSON(res, 200, datosSeq(seq));
        }

        // API: aplicar una heurística -----------------------------------------
        if (ruta === '/api/heuristic' && req.method === 'POST'){
            const body = await leerBody(req);
            if (!body.ams || !body.op){
                return responderJSON(res, 400, {error: 'faltan los campos ams y op'});
            }
            const seq = BancoDeSecuencias.secuenciaDesdeAMS(body.ams);
            const params = Array.isArray(body.params) ? body.params : [];
            let seqTransformada;

            if (body.op === 'transmutarAlturas'){
                seqTransformada = seq;
                Heuristicos.transmutarAlturas(seq, BancoDeSecuencias.secuenciaDesdeAMS(body.amsB || ''));
            } else if (body.op === 'transmutarDuraciones'){
                seqTransformada = seq;
                Heuristicos.transmutarDuraciones(seq, BancoDeSecuencias.secuenciaDesdeAMS(body.amsB || ''));
            } else {
                seqTransformada = aplicarHeuristica(seq, body.op, params);
            }

            if (!seqTransformada){
                return responderJSON(res, 400, {error: `operación desconocida: ${body.op}`});
            }
            return responderJSON(res, 200, {op: body.op, ...datosSeq(seqTransformada)});
        }

        // API: MIDI de una partitura (endpoint propio) -------------------------
        // (atendido arriba por matchScoreMidi)

        responderJSON(res, 404, {error: 'ruta no encontrada'});
    } catch (e){
        responderJSON(res, 400, {error: e.message});
    }
});

servidor.listen(PUERTO, () => {
    console.log(`Emulador Comdasuar - servidor de desarrollo en http://localhost:${PUERTO}`);
    console.log(`Partituras disponibles: ${listarScores().length}`);
});
