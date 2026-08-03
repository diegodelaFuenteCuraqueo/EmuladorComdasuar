/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

const {getDiccionarioAsuar} = require('./diccionarioAsuar.js');
const {crearZip} = require('./zip.js');

/** Resolución de pulsos por negra (clásica para SMF). */
const PPQ = 480;

/**
 * MIDIexport
 * Convierte un banco de SecuenciaAsuar a un archivo MIDI (Standard MIDI File).
 * Formato 1: la pista 0 es la pista "conductor" (tempo y compás), y cada
 * SecuenciaAsuar del banco ocupa una pista propia.
 * Convenciones:
 *  - v1 asume un tempo único compartido (el de la primera secuencia del banco).
 *  - Los silencios (midicent <= 0) generan pausas: no se emiten notas, solo
 *    avanza el reloj.
 *  - Los midicents con cuartos de tono se redondean al semitono MIDI más próximo.
 *  - Cada nota se emite como NoteOn (0x90) + NoteOff (0x80); no se usa running status.
 *  - La salida es un Uint8Array listo para guardarse como .mid (ver guardar/descargar).
 */
class MIDIexport {

    static get PPQ(){ return PPQ; }

    /** Convierte un banco completo a bytes MIDI.
     *  @param {import('./BancoDeSecuencias.js').BancoDeSecuencias|Array} banco Banco con .secuencias o array de SecuenciaAsuar.
     *  @returns {Uint8Array} Archivo SMF formato 1. */
    static bancos2mid(banco){
        const secuencias = Array.isArray(banco) ? banco : (banco && banco.secuencias) || [];
        if (secuencias.length === 0){
            throw new Error("MIDIexport: el banco no contiene secuencias.");
        }

        const quarterMs = MIDIexport.quarterMs(secuencias[0].getTempo());
        const uspq = Math.round(quarterMs * 1000); // microsegundos por negra

        const tracks = [MIDIexport.construirConductor(uspq)];
        for (const seq of secuencias){
            tracks.push(MIDIexport.construirTrack(seq, quarterMs));
        }
        return MIDIexport.construirArchivo(tracks);
    }

    /** Convierte una única secuencia a bytes MIDI (banco de una pista). */
    static secuencia2mid(seq){
        return MIDIexport.bancos2mid([seq]);
    }

    /** Etiqueta `banco_secuencia` para una secuencia dentro de un banco.
     *  Se usa como nombre de archivo en el ZIP exportado. */
    static etiquetaSecuencia(banco, i){
        const bancoIdx = (banco && typeof banco.getIndice === "function" && banco.getIndice() >= 0)
            ? banco.getIndice()
            : 0;
        return bancoIdx + "_" + i;
    }

    /** Convierte un banco completo a un ZIP con un archivo .mid por secuencia.
     *  Cada entrada se llama `{banco}_{secuencia}.mid` (p. ej. `0_0.mid`).
     *  @param {import('./BancoDeSecuencias.js').BancoDeSecuencias|Array} banco Banco con .secuencias o array de SecuenciaAsuar.
     *  @returns {Uint8Array} Archivo ZIP (entradas sin comprimir). */
    static bancos2zip(banco){
        const secuencias = Array.isArray(banco) ? banco : (banco && banco.secuencias) || [];
        if (secuencias.length === 0){
            throw new Error("MIDIexport: el banco no contiene secuencias.");
        }

        const entradas = secuencias.map((seq, i) => ({
            nombre: MIDIexport.etiquetaSecuencia(banco, i) + ".mid",
            bytes: MIDIexport.secuencia2mid(seq)
        }));
        return crearZip(entradas);
    }

    /** Milisegundos por negra según el tempo {figura, pulsosPorMin, duracionPulso}.
     *  quarterMs = duracionPulso * 1000 / ritmos[figura]  (la negra N vale 1000 por convención). */
    static quarterMs(tempo){
        const dict = getDiccionarioAsuar();
        const ritmoFigura = dict.ritmos[tempo.figura] || dict.ritmos.N;
        return (1000 * tempo.duracionPulso) / ritmoFigura;
    }

    /** Construye la pista 0 (conductor): tempo + compás 4/4 + fin. */
    static construirConductor(uspq){
        const bytes = [];
        let lastTick = 0;

        const emitirMeta = (tick, tipo, datos) => {
            const delta = Math.max(0, Math.round(tick) - lastTick);
            appendVLQ(bytes, delta);
            bytes.push(0xFF, tipo, datos.length, ...datos);
            lastTick = Math.round(tick);
        };

        // Tempo (FF 51 03)
        emitirMeta(0, 0x51, [(uspq >> 16) & 0xFF, (uspq >> 8) & 0xFF, uspq & 0xFF]);
        // Compás 4/4 (FF 58 04)
        emitirMeta(0, 0x58, [0x04, 0x02, 0x18, 0x08]);
        // Fin de pista (FF 2F 00)
        emitirMeta(0, 0x2F, [0x00]);

        return bytes;
    }

    /** Construye la pista de una secuencia: nombre + notas + fin. */
    static construirTrack(seq, quarterMs){
        const bytes = [];
        let lastTick = 0;

        const emitir = (tick, status, d1, d2) => {
            const delta = Math.max(0, Math.round(tick) - lastTick);
            appendVLQ(bytes, delta);
            bytes.push(status, d1, d2);
            lastTick = Math.round(tick);
        };
        const emitirMeta = (tick, tipo, datos) => {
            const delta = Math.max(0, Math.round(tick) - lastTick);
            appendVLQ(bytes, delta);
            bytes.push(0xFF, tipo, datos.length, ...datos);
            lastTick = Math.round(tick);
        };

        emitirMeta(0, 0x03, asciiBytes((seq.getNombre() || "Track").trim()));

        for (const nota of seq.getNotas()){
            const mc = nota.getMidicent();
            if (mc <= 0) continue; // silencio
            const midi = Math.round(mc / 100);
            if (midi <= 0 || midi > 127) continue;

            const on = (nota.getInicio() / quarterMs) * PPQ;
            const off = ((nota.getInicio() + nota.getMS()) / quarterMs) * PPQ;

            emitir(on, 0x90, midi, 0x50);
            emitir(off, 0x80, midi, 0x00);
        }

        emitirMeta(0, 0x2F, [0x00]);
        return bytes;
    }

    /** Ensambla la cabecera MThd y los chunks MTrk. */
    static construirArchivo(tracks){
        const bytes = [];

        // Cabecera: MThd, longitud 6, formato 1, ntrks, división (PPQ)
        bytes.push(0x4D, 0x54, 0x68, 0x64);
        bytes.push(0x00, 0x00, 0x00, 0x06);
        bytes.push(0x00, 0x01);
        bytes.push((tracks.length >> 8) & 0xFF, tracks.length & 0xFF);
        bytes.push((PPQ >> 8) & 0xFF, PPQ & 0xFF);

        for (const track of tracks){
            bytes.push(0x4D, 0x54, 0x72, 0x6B);
            bytes.push(
                (track.length >> 24) & 0xFF,
                (track.length >> 16) & 0xFF,
                (track.length >> 8) & 0xFF,
                track.length & 0xFF
            );
            bytes.push(...track);
        }

        return new Uint8Array(bytes);
    }

    /** Dispara la descarga del archivo en el navegador. No-op en Node.
     *  El tipo MIME se deduce de la extensión del archivo (.mid → audio/midi,
     *  .zip → application/zip). */
    static descargar(bytes, nombre){
        if (typeof window === "undefined"){
            console.warn("[MIDIexport] descargar() solo funciona en el navegador.");
            return;
        }
        nombre = nombre || "archivo.bin";
        const ext = (nombre.split('.').pop() || '').toLowerCase();
        const tipos = {
            mid: "audio/midi",
            midi: "audio/midi",
            zip: "application/zip",
            json: "application/json",
            txt: "text/plain"
        };
        const blob = new Blob([bytes], { type: tipos[ext] || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

/** Anexa un delta-tiempo en formato variable-length quantity (SMF). */
function appendVLQ(bytes, value){
    value = Math.max(0, Math.round(value));
    const tmp = [];
    tmp.push(value & 0x7F);
    while ((value >>= 7) > 0){
        tmp.push((value & 0x7F) | 0x80);
    }
    for (let i = tmp.length - 1; i >= 0; i--) bytes.push(tmp[i]);
}

/** Convierte texto a bytes ASCII (para metaeventos de texto MIDI). */
function asciiBytes(texto){
    const out = [];
    for (let i = 0; i < texto.length; i++) out.push(texto.charCodeAt(i) & 0x7F);
    return out;
}

exports.MIDIexport = MIDIexport;
