/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

/** Reproductor WebAudio (solo navegador).
 *  Programa osciladores a partir de las notas de una SecuenciaAsuar usando sus
 *  inicios (ms), duraciones (ms) y midicents. Los silencios (midicent <= 0)
 *  se omiten, generando pausas naturales en la línea de tiempo.
 *  En Node este módulo es inofensivo: solo hace algo al llamar play() en un
 *  contexto con AudioContext disponible. */
class Reproductor {

    /** @param {import('./SecuenciaAsuar.js').SecuenciaAsuar} secuencia Secuencia a reproducir.
     *  @param {Object} [opciones] { volumen: 0..1, tipoOnda: 'sine'|'square'|'triangle'|'sawtooth' } */
    constructor(secuencia, opciones){
        this.seq = secuencia;
        this.opciones = Object.assign({ volumen: 0.25, tipoOnda: "sine" }, opciones || {});
        this.ctx = null;
        this.nodos = [];
        this.playing = false;
    }

    /** Obtiene (creándolo perezosamente) el AudioContext del navegador. */
    get contexto(){
        if (typeof window === "undefined") return null;
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        if (!this.ctx) this.ctx = new Ctor();
        return this.ctx;
    }

    /** Programa la secuencia completa y comienza la reproducción. */
    async play(){
        const ctx = this.contexto;
        if (!ctx){
            console.error("[Reproductor] WebAudio no disponible en este entorno.");
            return;
        }
        if (ctx.state === "suspended") await ctx.resume();

        const t0 = ctx.currentTime + 0.08;
        const notas = this.seq.getNotas();

        for (const nota of notas){
            const inicio = t0 + nota.getInicio() / 1000;
            const duracion = Math.max(0.06, nota.getMS() / 1000);

            //los acordes suenan todas sus alturas a la vez (un oscilador por altura)
            for (const mc of nota.getMidicents()){
                if (mc <= 0) continue; // silencio
                const freq = Reproductor.midicent2hz(mc);
                this.programarNota(ctx, freq, inicio, duracion);
            }
        }

        this.playing = true;
        this.fin = t0 + this.seq.getDuracionTotal() / 1000;
    }

    /** Programa un único tono con envolvente suave. */
    programarNota(ctx, freq, inicio, duracion){
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = this.opciones.tipoOnda;
        osc.frequency.setValueAtTime(freq, inicio);

        const ataque = 0.01;
        const suelta = 0.04;
        gain.gain.setValueAtTime(0, inicio);
        gain.gain.linearRampToValueAtTime(this.opciones.volumen, inicio + ataque);
        gain.gain.setValueAtTime(this.opciones.volumen, Math.max(inicio + ataque, inicio + duracion - suelta));
        gain.gain.linearRampToValueAtTime(0, inicio + duracion);

        osc.connect(gain).connect(ctx.destination);
        osc.start(inicio);
        osc.stop(inicio + duracion + 0.05);
        this.nodos.push(osc);
    }

    /** Detiene la reproducción y cierra el AudioContext. */
    async stop(){
        const ctx = this.contexto;
        this.playing = false;
        if (!ctx) return;
        for (const osc of this.nodos){
            try { osc.stop(); } catch (e) { /* ya detenido */ }
        }
        this.nodos = [];
        await ctx.close();
        this.ctx = null;
    }

    /** Convierte un midicent a frecuencia en Hz (A4 = 440 Hz = 6900 mc). */
    static midicent2hz(mc){
        const midi = mc / 100;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }
}

exports.Reproductor = Reproductor;
