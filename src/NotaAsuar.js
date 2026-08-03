/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

const {getDiccionarioAsuar} = require('./diccionarioAsuar.js');
const AMS = getDiccionarioAsuar();
const {log} = require('./util.js');

/** Se compone de un objeto AlturaAsuar y DuracionAsuar.
*  También incluye otros datos relativos a la nota tales como su posición relativa en la SecuenciaAsuar, el tiempo de inicio y final (entre otros). */
class NotaAsuar{

    /** Nota generada utilizando nomenclatura Asuar (AMS)
     *  @param {String} altura      Altura expresada en código Asuar (AMS).
     *                              Puede contener un acorde (alturas separadas por "."). */
    constructor(altura, duracion){

        this.alturas = [];
        this.cargarAlturas(altura);
        this.duracion = new DuracionAsuar(duracion);
        this.inicio = 0;
        this.fin = 0;

        //posicion relativa de la nota (en una secuencia)
        this.indice = 0;

        this.esNota = true;
    }

    /** Interpreta una altura AMS que puede contener un acorde (alturas separadas
     *  por "."). La primera altura es la "primaria" (this.altura); las demás
     *  solo aportan sonidos simultáneos. */
    cargarAlturas(alturaAMS){
        const lista = String(alturaAMS).split(".").filter(s => s !== "");
        this.alturas = [];
        for(let a of lista){
            this.alturas.push(new AlturaAsuar(a));
        }
        if(this.alturas.length === 0){
            this.alturas.push(new AlturaAsuar(""));
        }
        this.altura = this.alturas[0];
    }

    /** @param {NotaAsuar} nota objeto NotaAsuar en formato JSON (sin métodos). Los valores serán copiados al objeto actual. */
    cargarNota(nota){
        log(`**** Cargando nota ${nota.altura.alturaAMS} ${nota.duracion.duracionAMS} (mc:${nota.altura.midinote} ms:${nota.duracion.duracionMS}) `)
        this.esNota = nota.esNota;

        //acordes: nota.alturas[]; compatibilidad con JSON antiguo: nota.altura
        if(Array.isArray(nota.alturas) && nota.alturas.length > 0){
            this.alturas = nota.alturas.map(a => {
                let alt = new AlturaAsuar(a.alturaAMS);
                alt.setMidicent(a.midicent);
                return alt;
            });
        }else{
            let alt = new AlturaAsuar(nota.altura.alturaAMS);
            alt.setMidicent(nota.altura.midicent);
            this.alturas = [alt];
        }
        this.altura = this.alturas[0];

        this.duracion = new DuracionAsuar(nota.duracion.duracionAMS);
        this.duracion.setMS(nota.duracion.duracionMS);
        this.setInicio(nota.inicio);
        this.setIndice(nota.indice);
    }
    // SETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @param {number} ini inicio de la nota en milisegundos  */
    setInicio(ini){
        this.inicio = ini;
        this.fin = this.inicio+parseFloat(this.duracion.getMS());
    }
    /**@param {number} i indice de la nota (relativo a la secuencia en donde está almacenada)    */
    setIndice(i){   this.indice = i;}
    /** @param {number} ms nueva duración en milisegundos (reemplaza valor computado desde AMS) */
    setMS(ms){      this.duracion.setMS(ms) }

    // GETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @returns {number} inicio de la nota (con respecto a la secuencia a la que pertenece). */
    getInicio(){            return this.inicio;}
    /** @returns {number} duración de la nota en milisegundos. */
    getMS(){                return this.duracion.getMS();}
    /** @returns {number} duración en codigo Asuar (AMS) */
    getAMSdur(){            return this.duracion.getDuracionAMS();}
    /** @returns {number} altura en nota midi (0-127, 60 = Do central) */
    getMidinote(){          return this.altura.getMidinote();}
    /**@returns {String} altura en código Asuar (AMS)   */
    getAMSalt(){            return this.altura.getAlturaAMS();}
    /** @returns {number} altura en midicent (ej 6000 = Do central) */
    getMidicent(){          return this.altura.getMidicent();}
    /** @returns {AlturaAsuar[]} todas las alturas del evento (acorde). */
    getAlturas(){           return this.alturas.slice();}
    /** @returns {array} arreglo con los midicents de cada altura (acorde). */
    getMidicents(){         return this.alturas.map(a => a.getMidicent());}
    /** @returns {boolean} true si el evento suena más de una altura a la vez. */
    esAcorde(){             return this.alturas.length > 1;}
    /** @param {array|number} mcs arreglo con midicents (uno por altura); reemplaza las alturas del evento. */
    setMidicents(mcs){
        if(!Array.isArray(mcs)){ mcs = [mcs]; }
        for(let i = 0; i < this.alturas.length && i < mcs.length; i++){
            this.alturas[i].setMidicent(mcs[i]);
        }
    }

    /** Reemplaza el acorde completo: el arreglo define exactamente las alturas del
     *  evento (crea/elimina AlturaAsuar según la cantidad de midicents). Reutiliza
     *  la etiqueta AMS de las alturas que coincidan en midicent. */
    setAcorde(mcs){
        if(!Array.isArray(mcs)){ mcs = [mcs]; }
        const existentes = this.alturas;
        this.alturas = mcs.map(mc => {
            const previo = existentes.find(a => Math.abs(a.getMidicent() - mc) < 0.5);
            const alt = new AlturaAsuar(previo ? previo.getAlturaAMS() : "");
            alt.setMidicent(mc);
            return alt;
        });
        this.altura = this.alturas[0];
    }

    print(){
        let a = this.altura;
        let d= this.duracion;
        let i= this.inicio;
        let f= this.fin;
        let x=this.indice;
        console.log(`------------------ Nota Asuar ------------------`);
        console.log(`Altura: ${this.getAlturas().map(al => al.alturaAMS).join(" ")}  Ritmo: ${d.duracionAMS}  Indice (rel): ${x}`);
        console.log(`MIDI-note: ${a.getMidinote()}  Duracion: ${d.getMS()}ms.`);
        console.log(`Inicio: ${i.toFixed(2)}   Fin: ${f.toFixed(2)}  indice relativo: ${x}`);
    }
}

/** El objeto AlturaAsuar interpreta el código Asuar (AMS) de altura y permite convertir dicho dato a MIDI-note o MIDI-cent a partir del DiccionarioAsuar. */
class AlturaAsuar{

    /** @param {String} altAMS altura en código Asuar (AMS) */
    constructor(altAMS){
        //la nota en formato AMS (octava+nota+alteracion). Y en midinote y midicent
        this.alturaAMS = "";

        this.midinote = 0;
        this.midicent = 0;

        if(altAMS != "" || altAMS == null){
            this.setAltura(altAMS);
            this.compilarAlturaAMS();
        }
    }

    compilarAlturaAMS(){
        this.midinote = AMS.alt2mn(this.alturaAMS);
        this.midicent = AMS.alt2mc(this.alturaAMS);
    }

    // SETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /**Establece la altura en AMS y realiza las conversiones a midinote y midicent.
     * @param {String} altAMS - Altura expresada en formato AMS (oct+nota+alt)  */
    setAltura(altAMS){      this.alturaAMS = altAMS;}

    /** @param {number} mn nota midi (1 - 127) */
    setMidinote(mn){
        this.midinote = mn;
        this.midicent = this.midinote*100;
    }

    /** @param {number} mc midicent (100 - 12700) */
    setMidicent(mc){
        this.midicent = mc;
        this.midinote = this.midicent*0.01;
    }

    // GETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @returns {number} midinote  */
    getMidinote(){          return this.midinote;}
    /** @returns {number} midicent */
    getMidicent(){          return this.midicent;}
    /** @returns {String} Altura en codigo Asuar (AMS) */
    getAlturaAMS(){         return this.alturaAMS}

    clear(){    }
}

/** Permite interpretar una duración en código Asuar (AMS) para convertirla
 * a milisegundos o figura ritmica a partir del DiccionarioAsuar*/
class DuracionAsuar{

    /** @param {String} durAMS duracion en código Asuar (AMS)    */
    constructor(durAMS){
        //la duración en formato AMS y en MS
        this.duracionAMS = "";
        this.duracionMS = 0;

        this.setDuracionAMS(durAMS);
        this.compilarDuracionAMS();
    }

    compilarDuracionAMS(){
        this.duracionMS = AMS.dur2ms(this.duracionAMS);
    }

    // SETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @param {String} durAMS - Duración expresada en codigo Asuar. */
    setDuracionAMS(durAMS){     this.duracionAMS= durAMS;}
    /** @param {number} ms duración en milisegundos  */
    setMS(ms){                  this.duracionMS = ms;}

    // GETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @return {number} duración en milisegundos */
    getMS(){                    return this.duracionMS; }
    /** @returns {String} duración en código Asuar (AMS) */
    getDuracionAMS(){           return this.duracionAMS}
}

exports.NotaAsuar = NotaAsuar;

/*
const {NotaAsuar} = require('./NotaAsuar.js');
*/
