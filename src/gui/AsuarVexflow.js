/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

const {getDiccionarioAsuar} = require('../diccionarioAsuar.js');

/** Convierte una SecuenciaAsuar en un "modelo de partitura" para VexFlow.
 *
 *  Es una clase de visualización pura (como ResaltadorAMS): no toca el DOM ni
 *  importa VexFlow. Devuelve una estructura serializable lista para que el
 *  frontend la dibuje con la librería VexFlow.
 *
 *  El modelo es una partitura de piano (pentagrama doble) en un solo compás,
 *  sin compás/armadura (aún no hay firma de tiempo en AMS):
 *
 *   compilar() -> {
 *     nombre, tempo:{figura,pulsosPorMin},
 *     compases: [ { voces: {
 *       agudos: [ {claves:[], duracion:"8", silencio, ligada, tuplet, evento} ],
 *       graves: [ {claves:[], duracion:"8", silencio, ligada, tuplet, evento} ]
 *     } } ]
 *   }
 *
 *  - Las alturas con midicent >= opciones.splitMidicent (6000 = Do central, C4)
 *    van al pentagrama de agudos; las demás al de graves. Un acorde que cruza el
 *    umbral se reparte entre ambas voces.
 *  - Los silencios aparecen en ambas voces; las dos voces siempre tienen el
 *    mismo largo (una entrada por evento) para quedar alineadas en el tiempo.
 *  - La duración AMS se convierte a figuras VexFlow: exacta, con puntillo
 *    ("4d"/"4dd") o una cadena de figuras ligadas (ej. "NB" -> "2"+"4").
 *  - Las subdivisiones 3/5/7 (tresillo/quintillo/…) agrupan las figuras con
 *    tuplet; las de una sola figura se aproximan a la figura simple o con
 *    puntillo más cercana. */
class AsuarVexflow{

    /** @param {Object} secuencia SecuenciaAsuar (o cualquier objeto con
     *  getNotas()/getTempo()/getNombre() y notas con getAlturas()/getAMSdur()/
     *  getMidicent()).
     *  @param {Object} [opciones] {splitMidicent: 6000} umbral agudos/graves. */
    constructor(secuencia, opciones){
        this.secuencia = secuencia;
        this.opciones = opciones || {};
        this.splitMidicent = this.opciones.splitMidicent !== undefined
            ? this.opciones.splitMidicent : 6000;

        const dict = getDiccionarioAsuar();
        // base en cuartos de negra (milisegundos / 1000, como dur2ms)
        this.base = {};
        for (const f of Object.keys(dict.ritmos)){
            this.base[f] = dict.ritmos[f] / 1000;
        }
        this.subdivs = dict.subdivs;   // {"0":1,"3":0.6666,"5":.8,"7":0.875}

        this.duracionDe = {L:"0", R:"1", B:"2", N:"4", C:"8", S:"16", F:"32", M:"64"};
        this.figurasBase = [
            {d:"0",  q:8},
            {d:"1",  q:4},
            {d:"2",  q:2},
            {d:"4",  q:1},
            {d:"8",  q:0.5},
            {d:"16", q:0.25},
            {d:"32", q:0.125},
            {d:"64", q:0.0625},
        ];
        this.pcsSostenidos = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
        this.pcsBemoles = {1:"Db", 3:"Eb", 4:"Fb", 6:"Gb", 8:"Ab", 10:"Bb", 11:"Cb"};
    }

    /** Compila la secuencia al modelo de partitura VexFlow. */
    compilar(){
        const sec = this.secuencia;
        const notas = typeof sec.getNotas === "function" ? sec.getNotas() : (sec.notas || []);
        const tempo = typeof sec.getTempo === "function" ? sec.getTempo() : (sec.tempo || {figura:"N", pulsosPorMin:60});
        const compas = typeof sec.getCompas === "function" ? sec.getCompas() : (sec.compas || null);

        const voces = {agudos: [], graves: []};

        for (let e = 0; e < notas.length; e++){
            const nota = notas[e];
            const amsdur = typeof nota.getAMSdur === "function"
                ? nota.getAMSdur()
                : ((nota.duracion && nota.duracion.duracionAMS) || "");
            const esRest = nota.getMidicent() <= 0;
            const {figuras, tuplet} = this.duracionVexflow(amsdur);

            let agudosClaves = [];
            let gravesClaves = [];
            if (!esRest){
                const alturas = typeof nota.getAlturas === "function"
                    ? nota.getAlturas()
                    : (nota.alturas || (nota.altura ? [nota.altura] : []));
                const pares = alturas.map(a => ({mc: a.getMidicent(), clave: this.claveDeAltura(a)}));
                pares.sort((a, b) => a.mc - b.mc);
                for (const p of pares){
                    if (p.mc >= this.splitMidicent) agudosClaves.push(p.clave);
                    else gravesClaves.push(p.clave);
                }
            }

            for (const f of figuras){
                voces.agudos.push(this._descriptor(f, agudosClaves, tuplet, e));
                voces.graves.push(this._descriptor(f, gravesClaves, tuplet, e));
            }
        }

        return {
            nombre: typeof sec.getNombre === "function" ? sec.getNombre() : (sec.nombre || ""),
            tempo: {figura: tempo.figura, pulsosPorMin: tempo.pulsosPorMin},
            compas: compas ? {
                texto: compas.texto,
                numerador: compas.numerador,
                denominador: compas.denominador,
                agrupacion: compas.agrupacion || null,
            } : null,
            compases: notas.length ? [{voces}] : [],
        };
    }

    /** Crea el descriptor de una figura para una voz.
     *  @private */
    _descriptor(f, claves, tuplet, evento){
        return {
            claves: claves.slice(),
            duracion: f.duracion,
            silencio: claves.length === 0,
            ligada: !!f.ligada,
            tuplet: tuplet || null,
            evento,
        };
    }

    /** Clave VexFlow de una AlturaAsuar: respeta el bemol si el código AMS trae
     *  la alteración W; si no, usa sostenidos. Los cuartos de tono (U/V/T/R) se
     *  redondean al semitono más cercano (igual que MIDIexport). */
    claveDeAltura(altura){
        return this.claveDeMidicent(altura.getMidicent(), /W/.test(String(altura.getAlturaAMS() || "").toUpperCase()));
    }

    /** Clave VexFlow ("C/4") para un midicent.
     *  @param {number} mc midicent (100 por semitono).
     *  @param {boolean} [preferBemol] usar bemoles cuando exista esa escritura. */
    claveDeMidicent(mc, preferBemol){
        let mn = Math.round(mc / 100);
        mn = Math.max(0, Math.min(127, mn));
        const pc = ((mn % 12) + 12) % 12;
        const octava = Math.floor(mn / 12) - 1;
        const bemol = preferBemol ? this.pcsBemoles[pc] : undefined;
        return (bemol || this.pcsSostenidos[pc]) + "/" + octava;
    }

    /** Convierte una duración AMS a figuras VexFlow.
     *  @param {string} amsdur código de duración Asuar (ej. "N", "NP", "NB", "3NS").
     *  @returns {{figuras: Array<{duracion:string, ligada:boolean}>, tuplet: number|null}} */
    duracionVexflow(amsdur){
        const dur = String(amsdur == null ? "" : amsdur).trim().toUpperCase();
        if (dur === ""){
            return {figuras: [{duracion: "1", ligada: false}], tuplet: null};
        }

        let i = 0;
        let numTuplet = 0;
        if ("0357".includes(dur[0])){
            numTuplet = parseInt(dur[0], 10);
            i = 1;
        }
        const chars = dur.slice(i);
        if (chars === ""){
            return {figuras: [{duracion: "1", ligada: false}], tuplet: null};
        }

        const figuras = chars.split("").filter(c => this.duracionDe[c] !== undefined);

        //tuplet de varias figuras: se emiten tal cual, con el número de tuplet
        if (numTuplet > 0 && figuras.length >= 2){
            return {
                figuras: this._expandirCeros(figuras.map(c => ({duracion: this.duracionDe[c], ligada: false}))),
                tuplet: numTuplet,
            };
        }

        //total en cuartos de negra (replica dur2ms: cada "P" suma la mitad del anterior)
        let total = 0;
        for (let k = 0; k < chars.length; k++){
            const c = chars[k];
            if (this.duracionDe[c] !== undefined) total += this.base[c];
            else if (c === "P") total += this.base[chars[k - 1]] * 0.5;
        }
        if (numTuplet > 0) total *= this.subdivs[numTuplet];

        //tuplet de una sola figura: figura simple/puntillo más cercana
        if (numTuplet > 0){
            return {figuras: [this._figuraMasCercana(total)], tuplet: null};
        }
        return {figuras: this._expandirCeros(this._redondear(total)), tuplet: null};
    }

    /** VexFlow no tiene redonda doble (breve, "0"): se expande a dos redondas.
     *  Las notas quedan ligadas entre sí; los silencios no (el frontend ignora
     *  ligaduras sobre silencios).
     *  @private */
    _expandirCeros(figuras){
        const out = [];
        for (const f of figuras){
            if (f.duracion !== "0"){
                out.push(f);
                continue;
            }
            out.push({duracion: "1", ligada: f.ligada});
            out.push({duracion: "1", ligada: f.ligada});
        }
        return out;
    }

    /** Figura (o cadena ligada) que reparte exactamente `total` cuartos.
     *  @private */
    _redondear(total){
        const eps = 1e-3;

        //figura simple exacta
        for (const f of this.figurasBase){
            if (Math.abs(total - f.q) < 1e-6) return [{duracion: f.d, ligada: false}];
        }
        //figura con puntillo / doble puntillo exacta
        for (const f of this.figurasBase){
            if (Math.abs(total - f.q * 1.5) < eps) return [{duracion: f.d + "d", ligada: false}];
            if (Math.abs(total - f.q * 1.75) < eps) return [{duracion: f.d + "dd", ligada: false}];
        }
        //cadena ligada: figuras grandes primero
        const lista = [];
        let resto = total;
        while (resto > eps){
            let elegido = this.figurasBase[this.figurasBase.length - 1];
            for (const f of this.figurasBase){
                if (f.q <= resto + eps){ elegido = f; break; }
            }
            lista.push({duracion: elegido.d, ligada: true});
            resto -= elegido.q;
        }
        if (lista.length === 0){
            return [{duracion: "4", ligada: false}];
        }
        lista[lista.length - 1].ligada = false;
        return lista;
    }

    /** Figura simple o con puntillo más cercana a `total` cuartos.
     *  @private */
    _figuraMasCercana(total){
        let mejor = this.figurasBase[0];
        let mejorDif = Infinity;
        for (const f of this.figurasBase){
            for (const mult of [1, 1.5, 1.75]){
                const dif = Math.abs(f.q * mult - total);
                if (dif < mejorDif){
                    mejorDif = dif;
                    mejor = {duracion: mult === 1 ? f.d : f.d + (mult === 1.5 ? "d" : "dd"), q: f.q * mult};
                }
            }
        }
        return {duracion: mejor.duracion, ligada: false};
    }
}

exports.AsuarVexflow = AsuarVexflow;
