/* Bundle generado automáticamente para navegador (NO EDITAR).
 * Se genera con: node tools/build-browser.js
 * Fuente: módulos CommonJS en src/. */
(function(){
"use strict";
var __modules = {};
var __cache = {};
function __require(id){
  if(__cache[id]) return __cache[id].exports;
  var m = { exports: {} };
  __cache[id] = m;
  __modules[id](m, m.exports, __require);
  return m.exports;
}

__modules['./util.js'] = function(module, exports, __require){
var require = __require;
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

};

__modules['./diccionarioAsuar.js'] = function(module, exports, __require){
var require = __require;
/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
 +=================================================================================*/

const {log} = require('./util.js');

/** Contiene todos los elementos de la Sintaxis Musical Asuar (AMS).
 * Puede convertir datos de altura y duraciones a otras magnitudes.    */
class DiccionarioAsuar{

    constructor(){
        log (" * DiccionarioAsuar constructor * ")

        //Variables con código Asuar y sus respectivos valores
        this.octava         ={"1":24,  "2":36,     "3": 48,"4": 60,    "5": 72, "6": 84,"7":96 ,  "8":108          };
        this.notas 		    ={"C":0,   "D":2,      "E":4,  "F":5,      "G":7,   "A":9,  "B":11,   "R": -200        };
        this.alteraciones   ={"S":1,   "W":-1,     "Q":0,  "U":.5, "T":1.5,    "V":-.5, "R":-1.5                           };

        this.ritmos		    ={"L":8000,"R":4000,   "B":2000,"N":1000,  "C":500, "S":250,"F":125,  "M":62.5, "P":0.5};
        this.subdivs 	    ={"0": 1,  "3":0.6666, "5":.8 , "7":0.875                                              };
    }

    /** Convierte duración en AMS a milisegundos
     * @param {String} amsdur Duración en sintaxis musical Asuar (String)
     * @returns {number} Duración en milisegundos.  */
     dur2ms( amsdur ){

        try{
            if(amsdur == "")  throw "código vacío. \"\" (?)";
            if(typeof amsdur != "string" || !Object.prototype.toString.call(amsdur).includes("String")) throw "tipo de dato incorrecto"
        }catch(e){
            console.error(" ERROR: "+e)
            return ;
        }

        let duracionMS = 0;
        let dur = amsdur.toUpperCase();

        //indica una subdivisión - - - - - - - - - - - - - - - - - - - - - - - - - -
        if( dur[0] in this.subdivs){
            //sumamos duraciones una a una...
            let subdivision = parseFloat(this.subdivs[dur[0]]);

            for(let i = 1; i < dur.length; i++){

                 //si el elemento es puntillo se suma la mitad del ritmo anterior
                 if(dur[i] === "P"){
                    try{
                        duracionMS += (this.ritmos[dur[i-1]] * .5);
                    }catch(er){console.error(" ERROR: AMS no reconocido (ritmo erroneo?). "+er)}

                //si no es puntillo, entonces se suma la figura actual
                }else if(!(dur[i] === "P") ){
                    try{
                        duracionMS += parseFloat(this.ritmos[dur[i]]);
                    }catch(er){console.error(" ERROR: AMS no reconocido (ritmo erroneo?). "+er)}

                }else{
                    console.error(" ERROR : Ritmo no identificado (SD) "+dur[i]);}
            }

            //aplicamos el grupo irregular respectivo
            duracionMS = subdivision * parseFloat(duracionMS);

        //no indica una subdivisión  - - - - - - - - - - - - - - - - - - - - - - - -
        }else{
            //sumamos duraciones una a una...
            for(let i = 0; i < dur.length; i++){

                //si el elemento es puntillo se suma la mitad del ritmo anterior
                if(dur[i] === "P"){
                    try{
                        duracionMS += ( parseFloat(this.ritmos[dur[i-1]]) * .5);
                    }catch(er){console.error(" ERROR: AMS no reconocido (ritmo erroneo?). "+er)}

                //si no es puntillo, entonces se suma la figura actual
                }else if(!(dur[i] === "P") ){
                    try{
                        duracionMS += parseFloat(this.ritmos[dur[i]]);
                    }catch(er){console.error(" ERROR: AMS no reconocido (ritmo erroneo?). "+er)}

                }else{
                    console.error(" ERROR : Ritmo no identificado "+dur[i]);}
            }
        }

        try{
            if(isNaN(duracionMS)) throw "ERROR al calcular duracion (código incorrecto? NaN) ;"
        }catch(err){
            console.error(err)
        }
        return duracionMS;
    }

    /** AMSalt2midinote
     * @param {String} amsalt Altura en sintaxis musical Asuar (String)
     * @returns Altura en MIDI note.
     */
    alt2mn( amsalt ){

        try{
            if(amsalt == "")  throw "código vacío. \"\" (?)";
            if(typeof amsalt != "string" || !Object.prototype.toString.call(amsalt).includes("String")) throw `tipo de dato incorrecto ${typeof amsalt}`
        }catch(e){
            console.error(" ERROR: "+e);
            return ;
        }

        let midinote = 0;
        let alt = amsalt.toUpperCase();

        //octava+nota
        if(alt.length == 2){
            try{
                midinote = this.octava[alt[0]] + this.notas[alt[1]];
            }catch(er){console.error(" ERROR: AMS no reconocido (nota erronea?). "+er);}

        //oct+nota+alteracion
        }else if(alt.length == 3){
            try{
                midinote = this.octava[alt[0]] + this.notas[alt[1]] + this.alteraciones[alt[2]];
            }catch(er){console.error(" ERROR: AMS no reconocido (nota erronea?). "+er);}
        }

        try{
            if(isNaN(midinote)) throw "ERROR al calcular nota (código incorrecto? NaN) "+midinote;
        }catch(err){
            console.error(err)
        }

        return midinote > 0 ? midinote : 0;
    }

    /** AMSalt2midicent
     * @param {String} amsalt Altura en Sintaxis Musical Asuar (String)
     * @returns Altura en MIDI cent.*/
    alt2mc( amsalt ){
        return this.alt2mn(amsalt)*100;
    }
}

/*
const {DiccionarioAsuar} = require('./diccionarioAsuar.js');
let AMS = new DiccionarioAsuar();
*/

let _diccionarioSingleton = null;

/** Retorna una instancia compartida (singleton) de DiccionarioAsuar.
 *  El diccionario no tiene estado, por lo que una sola instancia es suficiente. */
function getDiccionarioAsuar(){
    if(_diccionarioSingleton == null){
        _diccionarioSingleton = new DiccionarioAsuar();
    }
    return _diccionarioSingleton;
}

exports.DiccionarioAsuar = DiccionarioAsuar;
exports.getDiccionarioAsuar = getDiccionarioAsuar;


};

__modules['./NotaAsuar.js'] = function(module, exports, __require){
var require = __require;
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
     *  @param {String} altura      Altura expresada en código Asuar (AMS)
     *  @param {String} duracion    Duración expresada en código Asuar (AMS) */
    constructor(altura, duracion){

        this.altura = new AlturaAsuar(altura);
        this.duracion = new DuracionAsuar(duracion);
        this.inicio = 0;
        this.fin = 0;

        //posicion relativa de la nota (en una secuencia)
        this.indice = 0;

        this.esNota = true;
    }

    /** @param {NotaAsuar} nota objeto NotaAsuar en formato JSON (sin métodos). Los valores serán copiados al objeto actual. */
    cargarNota(nota){
        log(`**** Cargando nota ${nota.altura.alturaAMS} ${nota.duracion.duracionAMS} (mc:${nota.altura.midinote} ms:${nota.duracion.duracionMS}) `) 
        this.esNota = nota.esNota;
        this.altura = new AlturaAsuar(nota.altura.alturaAMS);
        this.altura.setMidicent(nota.altura.midicent);
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

    print(){
        let a = this.altura;
        let d= this.duracion;
        let i= this.inicio;
        let f= this.fin;
        let x=this.indice;
        console.log(`------------------ Nota Asuar ------------------`);
        console.log(`Altura: ${a.alturaAMS}  Ritmo: ${d.duracionAMS}  Indice (rel): ${x}`);
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

};

__modules['./SecuenciaAsuar.js'] = function(module, exports, __require){
var require = __require;
/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

const {NotaAsuar} = require('./NotaAsuar.js');
const {getDiccionarioAsuar} = require('./diccionarioAsuar.js');
const {log} = require('./util.js');

/**
 * Clase SecuenciaAsuar
 * Reune una lista de notasAsuar y parámetros melódicos de la secuencia misma.
 */
class SecuenciaAsuar{

    /**Crea una secuenciaAsuar (secuencia de NotaAsuar's)
     * @param {String} nombreSeq nombre de la secuencia actual  */
    constructor(nombreSeq){
        log(" * SecuenciaAsuar constructor * ")
        this.nombre = nombreSeq == "" || nombreSeq == undefined ? "[AsuarSeq] "  : nombreSeq;
        this.duracionTotal = 0;
        this.tempo = {figura:"N", pulsosPorMin:60, duracionPulso:1000};

        this.codigoAMS = "";
        this.seqIndex = -1;  //indice de la secuencia (relativo al banco dnd está almacenada)

        this.notas=[];
    }

    clear(){
        log(" * Limpiando SecuenciaAsuar...")
        this.nombre="";
        this.notas = [];
        this.duracionTotal = 0;
        this.codigoAMS = "";
        this.seqIndex = -1;
    }

    /** @param {NotaAsuar} nota Agrega un obj NotaAsuar al final de la secuencia     */
    addNota(nota){
        // nota instanceof NotaAsuar...
        //falta añadir control de errores en caso de que se ingrese otra cosa q no sea notaAsuar obj
        log("Añadiendo nota: "+nota.altura.alturaAMS+" "+nota.duracion.duracionAMS);
        this.notas.push(nota);
        this.calcularDuracionTotal();
        this.computarInicios();
    }

    /** Cambia nota de la secuencia Asuar
     * @param {*} indx Indice de la nota en la secuencia (posicion)
     * @param {*} nota obj NotaAsuar que ocupara la posicion    */
    cambiarNota(indx,nota){
        this.notas[indx] = null;
        this.notas[indx] = nota;
    }

    /**Calcula los inicios de cada una de las notas de la secuencia a partir
     * de sus duraciones y posiciones relativas en la secuencia.    */
    computarInicios(){
        this.notas[0].setInicio(0);
        this.notas[0].indice = 0;

        for(let n = 1 ; n < this.notas.length; n++){
            let ini = this.notas[n-1].getInicio()+this.notas[n-1].getMS();
            this.notas[n].setInicio(ini);
            this.notas[n].indice = n;
        }
        this.calcularDuracionTotal();
    }

    /**Calcula la duración total de la secuencia
     * Es igual la suma de todas las duraciones de todas las notas. */
    calcularDuracionTotal(){
        let durTotal = 0;
        for(let nota of this.notas){    durTotal+=nota.getMS(); }
        this.duracionTotal = durTotal;
    }

    aplicarTempo(){

        const BPM2MS = (t) => (60/t)*1000;
        let diccionario = getDiccionarioAsuar();

        if(this.tempo.figura != "N" || this.tempo.duracionPulso != 1000){
            log(" ~ Cambiando tempo de secuencia: "+this.tempo.figura+"="+this.tempo.duracionPulso)

            let escalaTempo = BPM2MS( this.tempo.pulsosPorMin ) / diccionario.ritmos[this.tempo.figura];
            log(" ~ (Escala de tempo : "+escalaTempo+")")

            for(let n = 0; n < this.notas.length; n++){
                this.notas[n].setMS( this.notas[n].getMS()*escalaTempo );
            }

            this.calcularDuracionTotal();
        }else{
            log(" ~ (manteniendo pulso por defecto "+this.tempo.figura+"="+this.tempo.pulsosPorMin+")");
        }
        this.computarInicios();
    }

    /** @param {Object} seq Objeto Secuencia Asuar cargado como JSON (sin métodos). Reemplazará la secuencia actual. */
    cargarSecuencia(seq){
        this.nombre = seq.nombre == "" || seq.nombre == undefined ? "Seq" : seq.nombre;
        this.tempo = seq.tempo;
        this.codigoAMS = seq.codigoAMS;
        this.seqIndex = seq.seqIndex;

        this.notas=[];
        log(`\n*** Cargando secuencia: ${seq.nombre}  (${seq.notas.length} notas)`)
        for(let n of seq.notas){

            let nota = new NotaAsuar(n.altura.alturaAMS,n.duracion.duracionAMS);
            nota.cargarNota(nota);
            this.notas.push(nota);
        }
        this.setTempo(seq.tempo);
        this.aplicarTempo();
        this.computarInicios();
    }
    // SETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @param {String} n nuevo nombre para la secuencia actual                    */
    setNombre(n){       this.nombre = n;}
    /**@param {number} i Indice de la secuencia actual (relativo a su banco)       */
    setIndex(i){        this.seqIndex = i;}
    /** @param {String} str Texto con código Asuar original (sin procesar)         */
    setCodigoAMS(str){  this.codigoAMS = str;}
    /** @param {Object} t Objeto Tempo a copiar (parámetros). */
    setTempo(t){
        this.tempo.figura = t.figura;
        this.tempo.pulsosPorMin = t.pulsosPorMin;
        this.tempo.duracionPulso = (60/t.pulsosPorMin)*1000;
    }

    /**
     * @param {array} ms arreglo con duraciones en milisegundos. Reemplazará las duraciones actuales y computará los inicios de cada nota a partir de los cambios.
     */
    setDuraciones(ms){
        let contador = 0;
        for(let nota of this.notas){
            if(ms[contador] != undefined && ms[contador] != null){
                nota.setMS( ms[contador++] );
            }
        }
        this.computarInicios();
    }

    /**
     * @param {array} mcs arreglo con midicents. Reemplazará los midicents actuales
     */
    setMidicents(mcs){
        let contador = 0;
        for(let nota of this.notas){
            if(mcs[contador] != undefined && mcs[contador] != null){
                nota.altura.setMidicent( mcs[contador++] );
            }
        }
    }
    // GETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    getNombre(){            return this.nombre; }
    getDuracionTotal(){     return this.duracionTotal; }

    /** @returns {String} Lista de duraciones en formato Bach     */
    getBachDuraciones(){
        let arrNotas = [];
        for(let nota of this.notas){
            if(nota.altura.alturaAMS.includes("R")) { continue; }
            arrNotas.push(nota.getMS());
        }
        return "("+arrNotas.join(" ")+")";
    }

    /** @returns {string} Lista de midicents en formato Bach  (incluye paréntesis e ignora silencios) */
    getBachMidicents(){
        let arrMidic = [];
        for(let nota of this.notas){
            if(nota.altura.alturaAMS.includes("R")) { continue; }
            arrMidic.push(nota.getMidicent());
        }
        return "("+arrMidic.join(" ")+")";
    }

    /** @returns {string} Lista de inicios en formato Bach (incluye paréntesis e ignora silencios)*/
    getBachInicios(){
        let arrIni = [];
        for(let nota of this.notas){
            if(nota.altura.alturaAMS.includes("R")) { continue; }
            arrIni.push(nota.getInicio());
        }
        return "("+arrIni.join(" ")+")";
    }
    /** @returns {array} arreglo con midicents de la secuencia (incluye paréntesis e ignora silencios) */
    getMidicents(){
        let mc = [];
        for(let nota of this.notas){    mc.push(nota.getMidicent());}
        return mc;
    }
    /** @returns {array} arreglo con duraciones de la secuencia       */
    getDuraciones(){
        let d = [];
        for(let nota of this.notas){    d.push(nota.getMS());}
        return d;
    }
    /** @returns {array} arreglo con Inicios de la secuencia       */
    getInicios(){
        let i = [];
        for(let nota of this.notas){    i.push(nota.getInicio());}
        return i;
    }
    /** @param {number} indice Indice del array de notas (0 - cantidad de notas)  */
    getNota(indice){    return this.notas[indice];}

    getIndice(){        return this.seqIndex;}

    getNotas(){         return this.notas;}

    getTempo(){         return this.tempo;}

    getUltimaNota(){    return this.notas[this.notas.length-1];}

    print(){
        let separador = `\n+===================== Secuencia Asuar \'${this.nombre}\' =====================+`;
        console.log(separador);
        let dur = `| Duración total : ${(this.duracionTotal/1000).toFixed(1)} seg. | Tempo: ${this.tempo.figura+"="+this.tempo.pulsosPorMin} | `;
        let ind = this.seqIndex != -1 ? "Indice #"+this.seqIndex : "";
        let numnotas = ` ${ind} (${this.notas.length} notas) |\n`;

        let rep = separador.length - (dur.length+numnotas.length) < 0 ? 1 :  separador.length - (dur.length+numnotas.length) ;
        console.log(dur+ " ".repeat(  rep ) +numnotas);

        let out = [];
        for(let nota of this.notas){
            let a = nota.getMidicent();
            let d= nota.getMS();
            let ini= nota.inicio.toFixed(1);
            let f= nota.fin;
            let x=nota.indice;
            let i = nota.getInicio();
            out.push( { "Altura": nota.altura.alturaAMS,"Ritmo": nota.duracion.duracionAMS,"MIDIcent": a,
                        "Inicio": parseFloat(ini),"Duración ms": (parseFloat( d ))} );
        }
        console.table(out);
    }
}

exports.SecuenciaAsuar=SecuenciaAsuar;

//SecuenciaAsuar.getBachInicios()
};

__modules['./AMSparser.js'] = function(module, exports, __require){
var require = __require;
/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
 +=================================================================================*/

const {log} = require('./util.js');

/**Convierte código Asuar (AMS) en lista de alturas y duraciones
 * siguiendo la misma nomenclatura (sin hacer conversiones). */
class AMSparser{

    constructor(){
        log (" * AMSparser constructor * ")

        this.clear();
    }

    /** Vacía las variables del objeto   */
    clear(){
        this.stringIn = "";     //texto de entrada
        this.listaDePalabras = [];
        this.AMSalturas = [];
        this.AMSduraciones = [];

        this.tempo = {
            figura:"N",
            pulsosPorMin: 60,
            duracionPulso:1000
        }

        //misma secuencia pero con todas las redundancias necesarias para que el diccionarioAsuar las reconozca
        this.codigoPlano = {
            alturas : [],
            duraciones:[]
        }
        //obj J4 incluye variables relativas a la repetición de notas
        this.J4 = {
            seq: {  alt : [],   dur : []},
            activo: false,
            repeticiones: 0
        }
    }

    /** @param {String} AMSstring Texto de entrada con partitura escrita en código (AMS) */
    cargarPartitura(AMSstring){
        this.clear();
        this.stringIn = AMSstring;
        this.listaDePalabras = this.txt2listaPalabras(AMSstring);
    }

    /** Aplica las redundancias a cada elemento de las secuencias Asuar
     * de modo que puedan ser interpretadas individualmente por el diccionario asuar
     * Las alturas deben indicar por lo menos octava y nota (alteración opcional)
     * Las duraciones deben indicar almenos 1 ritmo y su grupo irregular,
     * el 0 sirve para anular el grupo irregular anterior. No es necesario que cada ritmo tenga un 0.*/
    aplicarRedundancias(){
        log("\nAPLICANDO REDUNDANCIAS - - - - - - - - - - - - - - - - - - - -");

        let gruposIrregulares = "0357".split("");
        let grupoIrregular = "";
        let octavas = "123456789".split("");
        let ultimaOctava = "";

        for(let i = 0; i < this.AMSalturas.length;i++){
            //aplicamos redundancias de octavas
            let alturaConTodosLosDatos = this.AMSalturas[i];
            if(!octavas.includes(alturaConTodosLosDatos[0]) && !alturaConTodosLosDatos.includes("R")){
                alturaConTodosLosDatos = ultimaOctava+alturaConTodosLosDatos;
            }else if(octavas.includes(alturaConTodosLosDatos[0])){
                ultimaOctava = alturaConTodosLosDatos[0];
            }

            this.codigoPlano.alturas.push(alturaConTodosLosDatos);

            //aplicamos redundancias de grupos irregulares
            let duracionConTodosLosDatos = this.AMSduraciones[i];

            if(gruposIrregulares.includes(duracionConTodosLosDatos[0])){
                grupoIrregular = duracionConTodosLosDatos[0];
            }else {
                if(grupoIrregular=="0"){
                }else{
                    duracionConTodosLosDatos =  grupoIrregular+duracionConTodosLosDatos;
                }
            }
            this.codigoPlano.duraciones.push(duracionConTodosLosDatos)

            log(this.AMSalturas[i]+" "+this.AMSduraciones[i]+" => "+alturaConTodosLosDatos+" "+duracionConTodosLosDatos );
        }

    }

    /** Convierte el texto de entrada en listas de alturas y duraciones.
     *  También aplica los cambios de modo y repeticiones de pasajes:
     *  J0, J1, J2    =     MODOS DE INPUT
     *  J4, J5        =     MODOS DE REPETICIÓN
     *  J3, J6, J7    =     MODOS DE MODULACION DE NOTA (aun no implementado :c )   */
    compilar(){
        log("========================== AMS PARSER ========================== ");
        let modoInputActivo = 0;
        let ritmoConstanteJ1= "";
        let alturaConstanteJ2="";

        //palabra por palabra...
        for(let i=0; i<this.listaDePalabras.length; i++){

            let codigoActual = this.listaDePalabras[i];
            log("Indice "+i+" : \'"+codigoActual+"\'");

            //el elemento es un cambio de modo J..  ---------------------------------------------------------//
            if(codigoActual.includes("J")){
                if(codigoActual[1]=="0" || codigoActual.includes("0")){  //J0 introducción normal (default)
                    this.aplicarRepeticionesJ4();   //agrega notas repetidas en caso de q J4 estuviera activo
                    log("  CAMBIO DE MODO  : "+codigoActual);
                    modoInputActivo = 0;
                    continue;

                }else if(codigoActual[1]=="1"){     //J1 Ritmo constante -  -  -  -  -  -  -  -  -  -  -  -  -
                    this.aplicarRepeticionesJ4();   //agrega notas repetidas en caso de q J4 estuviera activo
                    modoInputActivo = 1;
                    ritmoConstanteJ1 = this.listaDePalabras[i+1];
                    log("  CAMBIO DE MODO  : "+codigoActual+"\n  Ritmo constante : "+ritmoConstanteJ1+"\n (saltando siguiente)");
                    i++; continue;

                }else if(codigoActual[1]=="2"){     //J2 Altura constante -  -  -  -  -  -  -  -  -  -  -  -  -
                    this.aplicarRepeticionesJ4();   //agrega notas repetidas en caso de q J4 estuviera activo
                    modoInputActivo = 2;
                    alturaConstanteJ2 = this.listaDePalabras[i+1];
                    log("  CAMBIO DE MODO   : "+codigoActual+"\n  Altura constante : "+alturaConstanteJ2+"\n (saltando siguiente)");
                    i++; continue;

                }else if(codigoActual[1]=="3"){     //J3 Glissando (pendiente) -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

                }else if(codigoActual[1]=="4"){     //J4 repite notas (hasta cambio de modo)  -  -  -  -  -  -
                    this.J4.activo = true;
                    this.J4.repeticiones = parseInt(this.listaDePalabras[i+1]);
                    this.J4.seq = { alt : [], dur: [] };
                    log("  CAMBIO DE MODO : "+codigoActual+"\n   Repeticiones "+this.J4.repeticiones+"\n (saltando siguiente)");
                    i++; continue;

                }else if(codigoActual[1]=="5"){     //J5 repite pasaje (desde/hasta)  -  -  -  -  -  -  -  -  -
                    this.aplicarRepeticionesJ4();   //agrega notas repetidas en caso de q J4 estuviera activo
                    this.copiarPasajeJ5( parseInt(this.listaDePalabras[i+1])-1 , parseInt(this.listaDePalabras[i+2]));
                    i+=2; continue;
                }
            //el elemento es un cambio de tempo -------------------------------------------------------------//
            }else if(codigoActual.includes("=")){   //no debe llevar espacios (ej 'N=60')
                log(" * Cambiando pulso: "+codigoActual);

                let tmp = codigoActual.split("=");
                this.tempo.figura = tmp[0];
                this.tempo.pulsosPorMin = parseFloat(tmp[1]);
                this.tempo.duracionPulso= (60/this.tempo.pulsosPorMin)*1000;

            //el elemento altura o duración -----------------------------------------------------------------//
            }else{
                if(modoInputActivo == 0){           // INGRESANDO NOTA EN MODO J0
                    this.AMSalturas.push(codigoActual == "/" ? this.AMSalturas[this.AMSalturas.length-1]: codigoActual);
                    this.AMSduraciones.push( this.listaDePalabras[i+1] == "/" ? this.AMSduraciones[this.AMSduraciones.length-1] : this.listaDePalabras[i+1]);
                    i++; //se salta la duracion porque ya fue asignada

                }else if(modoInputActivo == 1){     //INGRESANDO NOTA EN MODO DURACION CONSTANTE
                    this.AMSalturas.push(codigoActual == "/" ? this.AMSalturas[this.AMSalturas.length-1]: codigoActual);
                    this.AMSduraciones.push(ritmoConstanteJ1);

                }else if(modoInputActivo == 2){     //INGRESANDO NOTA EN MODO ALTURA CONSTANTE
                    this.AMSalturas.push(alturaConstanteJ2);
                    this.AMSduraciones.push( codigoActual == "/" ? this.AMSduraciones[this.AMSduraciones.length-1] : codigoActual);
                }
                log("Nueva Nota : Altura "+this.AMSalturas[this.AMSalturas.length-1]+", duración: "+this.AMSduraciones[this.AMSduraciones.length-1]);

                if(this.J4.activo){     //el modo 4 está activo, vamos guardando las notas ingresadas
                    this.J4.seq.alt.push(this.AMSalturas[this.AMSalturas.length-1]);
                    this.J4.seq.dur.push(this.AMSduraciones[this.AMSduraciones.length-1]);
                }
            }
        }
        //aplicamos redundancias para generar secuencias planas (con todos los datos requeridos para compilar)
        this.aplicarRedundancias();
    }

    /** En caso de que se active otro modo, el modo J4 debe insertar todas las notas
     * almacenadas a este momento. Esta función se encarga de eso...    */
    aplicarRepeticionesJ4(){
        if(this.J4.activo){
            this.J4.activo = false;
            log("   * (MODO J4: Ingresando repetición del pasaje)")
            for(let i = 1; i < this.J4.repeticiones ; i++){
                this.AMSalturas = this.AMSalturas.concat(this.J4.seq.alt);
                this.AMSduraciones= this.AMSduraciones.concat(this.J4.seq.dur);
            }
        }
    }

    /** Aplica modo J5 (repite pasaje)
     * @param {numbrer} desde indice de la nota desde donde hay quecopiar
     * @param {number} hasta indice de la nota hasta donde hay que copiar (inclusive) */
    copiarPasajeJ5(desde,hasta){
        let J5desde = desde;
        let J5hasta = hasta;
        log("CAMBIO DE MODO : J5\n  Repetir de "+J5desde+" a "+J5hasta +"\n (saltando siguiente)");

        //insertamos repeticion
        let J5alts = this.AMSalturas.slice(J5desde,J5hasta);
        let J5durs = this.AMSduraciones.slice(J5desde,J5hasta);
        log(" * (MODO J5: Ingresando repeticion de pasaje. "+J5alts.length+" eventos)")

        this.AMSalturas = this.AMSalturas.concat(J5alts);
        this.AMSduraciones = this.AMSduraciones.concat(J5durs);
    }

    /**TXT2lista de palabras:
     * @param {String} stringIN cadena de texto con saltos de líneas y espacios.
     * @returns Array con palabras individuales (sin espacios ni saltos de línea).*/
    txt2listaPalabras(stringIN){
        //eliminamos saltos de linea y espacios duplicados
        let txtSinNewLine = stringIN.replace(/\n+/g," ");
        let txtSinEspaciosDup = txtSinNewLine.replace(/\s+/g,' ').split(" ");
        let arregloDePalabras = [];

        //construye arreglo con palabras
        for(let i = 0; i < txtSinEspaciosDup.length; i++){
            if(txtSinEspaciosDup[i] === ""){
                continue;
            }else{
                arregloDePalabras.push(txtSinEspaciosDup[i].toUpperCase());
            }
        }
        return arregloDePalabras;
    }

    /**
     * @returns {Object} Retorna objeto tempo con sus parámetros.
     */
    getTempo(){ return this.tempo;}

    /** API de alto nivel: carga, compila y entrega las secuencias planas y el tempo.
     * @param {string} amsString Partitura en código Asuar (AMS).
     * @returns {Object} { alturas: string[], duraciones: string[], tempo: Object } */
    parse(amsString){
        this.cargarPartitura(amsString);
        this.compilar();
        return {
            alturas: this.codigoPlano.alturas,
            duraciones: this.codigoPlano.duraciones,
            tempo: this.tempo
        };
    }

}

exports.AMSparser = AMSparser;
/*
const {AMSparser} = require('./AMSparser.js');
let AMSparser = new AMSparser();
*/

};

__modules['./Heuristicos.js'] = function(module, exports, __require){
var require = __require;
/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
 +=================================================================================*/

const {log} = require('./util.js');

class Heuristicos{
    constructor(){
        log (" * Heuristicos constructor * ")
    }

    /**
     * @param {*} AsuarSeq
     * @param {*} intervalo
     */
    static transportar(AsuarSeq,intervalo){
        log("\n [HEURISTICOS] ~ Transposición : "+intervalo+" mc.\n")
        let midicents = [];
        midicents = AsuarSeq.getMidicents();

        log("    Alturas iniciales     : " + midicents.join(" "))
        for(let i = 0; i < midicents.length; i++){
            midicents[i] = midicents[i] + intervalo;
        }
        AsuarSeq.setMidicents(midicents);
        log("    Alturas transportadas : "+ midicents.join(" ")+"\n [H] \n");

    }

    /**
     * @param {*} AsuarSeq 
      */
    static retrogradarAlturas(AsuarSeq){
        log("\n [HEURISTICOS] ~ Retrogradación de alturas \n")

        let midicents = [];
        midicents = AsuarSeq.getMidicents();
        log("    Alturas iniciales     : "+ midicents.join(" "));

        AsuarSeq.setMidicents(midicents.reverse());
        log("    Alturas retrogradadas : "+ midicents.join(" ")+"\n [H] \n");

    }

    /**
     * @param {*} AsuarSeq
      */
    static retrogradarDuraciones(AsuarSeq){
        log("\n [HEURISTICOS] ~ Retrogradación de duraciones \n")

        let milisegundos = AsuarSeq.getDuraciones();
        log("    Duraciones iniciales     : "+ milisegundos.join(" ")+ ` (${milisegundos.length})`);

        AsuarSeq.setDuraciones(milisegundos.reverse());
        log("    Duraciones retrogradadas : "+ AsuarSeq.getDuraciones().join(" ")+` (${milisegundos.length})`+"\n [H] \n");

    }

    /**
     * @param {*} AsuarSeq
     * @param {*} intervalo
     */
    static desordenarAlturas(AsuarSeq){
        log("\n [HEURISTICOS] ~ Desordenar de alturas \n")

        let Alturas = AsuarSeq.getMidicents();
        desordenar(Alturas);
        AsuarSeq.setMidicents(Alturas);
    }

    /**
     * @param {*} AsuarSeq
     * @param {*} intervalo
     */
    static desordenarDuraciones(AsuarSeq){
        log("\n [HEURISTICOS] ~ Desordenar de duraciones \n")

        let Duraciones = AsuarSeq.getDuraciones();
        desordenar(Duraciones);
        AsuarSeq.setDuraciones(Duraciones);
    }

    /**
     * @param {*} AsuarSeq
     * @param {*} intervalo
     */
    static invertir(AsuarSeq, eje){
        log("\n [HEURISTICOS] ~ Inversión : " + eje + " (mc. eje)\n")

        let notaEje= eje < 100 ? eje * 100 : eje ;
        let midicents = AsuarSeq.getMidicents();

        log("    Alturas iniciales : "+ midicents.join(" "));

        for(let i = 0; i < midicents.length; i++){
            midicents[i] = (2 * notaEje) - midicents[i];
        }
        AsuarSeq.setMidicents(midicents);
        log("    Alturas invertidas : "+ AsuarSeq.getMidicents().join(" ")+"\n [H] \n");
    }

    /**
     * @param {*} AsuarSeq
     * @param {*} intervalo
     */
    static expandirAlturas(AsuarSeq, eje, escala){
        log("\n [HEURISTICOS] ~ expandirAlturas : " + eje + " (mc. eje) x" +escala + "\n");

        let notaEje= eje < 100 ? eje * 100 : eje ;
        let midicents = AsuarSeq.getMidicents();

        log("    Alturas iniciales : "+ midicents.join(" "));

        for(let i = 0; i < midicents.length; i++){
            let diferencia =  ( notaEje - midicents[i] ) * -1 ;
            let notaInvertida = (diferencia * escala ) + notaEje;

            log(midicents[i]+" + "+diferencia + " = " + notaInvertida+"     "+( (eje - midicents[i] ) + midicents[i] ) );
            midicents[i] = notaInvertida; //( eje - midicents[i] ) + midicents[i] ; 
        }
        log(" *adding:" + midicents.join(" ") );
        AsuarSeq.setMidicents(midicents);
        log("    Alturas expandidas : "+ AsuarSeq.getMidicents().join(" ")+"\n [H] \n");
    }

    /**
     * @param {*} AsuarSeq
     * @param {*} intervalo
     */
    static expandirDuraciones(AsuarSeq,escala){
        log("\n [HEURISTICOS] ~ expandirDuración : "+ escala + " (escala) \n");
        let milisegundos = AsuarSeq.getDuraciones();

        for(let i = 0; i < milisegundos.length; i++){
            milisegundos[i] = milisegundos[i]*escala;
        }
        AsuarSeq.setDuraciones(milisegundos);
    }

    /**
     * @param {*} AsuarSeq
     * @param {*} intervalo
     */
    static transmutarAlturas(AsuarSeqA, AsuarSeqB){
        log("\n [HEURISTICOS] ~ Transmutación de Alturas \n")
        //log(AsuarSeqB)
        let midicentsA = AsuarSeqA.getMidicents();
        let midicentsB = AsuarSeqB.getMidicents();
        midicentsB = midicentsB.filter( (midicent) => midicent > 0);

        log("    Alturas iniciales (A)       : "+ midicentsA.join(" ")+` (${midicentsA.length}) ` );
        log("    Alturas aplicadas (B)       : "+ midicentsB.join(" ")+` (${midicentsB.length}) ` );

        let largoA = midicentsA.length + 1;
        let largoB = midicentsB.length + 1;

        let contB = 0;
        for(let i = 0; i < largoA ; i++){

            if(midicentsA[i] == 0){
                continue;
            }else{
                let alturaTransmutada = midicentsB[contB%largoB] ;
                midicentsA[i] = alturaTransmutada;
                contB++;
            }
        }
        log("    Alturas transmutadas (B->A) : "+ midicentsA.join(" ")+"\n [H] \n");
        AsuarSeqA.setMidicents(midicentsA);
    }

    /**
     * @param {*} AsuarSeq
     * @param {*} intervalo
     */
    static transmutarDuraciones(AsuarSeqA,AsuarSeqB){
        log("\n [HEURISTICOS] ~ Transmutación de duraciones \n")

        let milisegundosA = AsuarSeqA.getDuraciones();
        let milisegundosB = AsuarSeqB.getDuraciones();

        log("    Duraciones iniciales (A)      : "+ milisegundosA.join(" ")+` (${milisegundosA.length}) ` );
        log("    Duraciones aplicadas (B)      : "+ milisegundosB.join(" ")+` (${milisegundosB.length}) `  );

        let largoA = milisegundosA.length + 1;
        let largoB = milisegundosB.length + 1;

        for(let i = 0; i < largoA; i++){
            milisegundosA[i] = milisegundosB[i%largoB] ;
        }
        log("    Duraciones transmutadas (B->A): "+ milisegundosA.join(" ")+"\n [H] \n");
        AsuarSeqA.setDuraciones(milisegundosA);
    }

}

function desordenar(array) {
    array.sort(() => Math.random() - 0.5);
}

module.exports = Heuristicos;

};

__modules['./BancoDeSecuencias.js'] = function(module, exports, __require){
var require = __require;
/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/
const {SecuenciaAsuar} = require('./SecuenciaAsuar.js');
const {AMSparser} = require('./AMSparser.js');
const {NotaAsuar} = require('./NotaAsuar.js');
const {log} = require('./util.js');

/** Agrupa una o varias SecuenciasAsuar */
class BancoDeSecuencias{

    constructor(nombreBanco){
        log (" * BancoDeSecuencias constructor * ")

        this.nombre = nombreBanco == undefined || nombreBanco == "" ? "[AsuarBank] " : nombreBanco ;
        this.secuencias=[];
        this.seqActual = 0;
        this.indice = -1;
    }

    /** Crea una SecuenciaAsuar a partir de una partitura en formato AMS (sin agregarla al banco).
     * @param {string} ams Partitura en formato AMS.
     * @returns {SecuenciaAsuar} */
    static secuenciaDesdeAMS(ams){
        const AMS = new AMSparser();
        const {alturas, duraciones, tempo} = AMS.parse(ams);

        const seq = new SecuenciaAsuar();
        seq.setCodigoAMS(ams);
        for(let x = 0; x < alturas.length; x++){
            seq.addNota(new NotaAsuar(alturas[x], duraciones[x]));
        }
        seq.setTempo(tempo);
        seq.aplicarTempo();
        return seq;
    }

    //METODOS PARA LA MANIPULACION DE DATOS DE LAS SECUENCIAS - - - - - - - - - - - - - - - //
    /** @param {SecuenciaAsuar} seq Recibe una SecuenciaAsuar (obj) y lo añade a la lista.  */
    addSeq(seq){
        this.secuencias.push(seq);

        this.selSeq( this.secuencias.length-1 );
        this.secuencias[this.seqActual].setIndex( this.seqActual );

        if(this.secuencias[this.seqActual].getNombre() == undefined || this.secuencias[this.seqActual].getNombre() == ""){ 
            this.secuencias[this.seqActual].setNombre("AsuarSeq_"+this.seqActual);
        }
    }

    /** @param {string} amsSeq Recibe una partitura en formato AMS, la convierte en una SecuenciaAsuar y luego será añadida al banco. */
    addSeqAMS(amsSeq) {
        this.addSeq(BancoDeSecuencias.secuenciaDesdeAMS(amsSeq)); //la agrega al banco
    }

    /** @param {number} indice indice de la secuencia a reemplazar
     *  @param {SecuenciaAsuar} seq nueva secuencia que ocupará la posición */
    setSeq(indice, seq){
        this.secuencias[indice] = seq;
        this.selSeq(indice);
    }

    /** @param {number} n indice de la secuencia a manipular ( 0 a secuencias.length ) */
    selSeq(n){
        if( n <= this.secuencias.length -1 ){
            this.seqActual= n;
            log(` Secuencia seleccionada : ${this.seqActual} (de ${this.secuencias.length-1})` );
        }else{
            console.error("ERROR : indice incorrecto para la secuencia. "+n+" ( "+typeof n+" )");
        }
    }

    /** @param {string} nombreSeq Nombre de la secuencia a seleccionar. Si hay más de una secuencia con el mismo nombre seleccionará la primera. */
    selPorNombre(nombreSeq){
        for(let s of this.secuencias){
            if (s.getNombre()==nombreSeq){
                this.selSeq(s.getIndice());
            }
        }
    }

    /** Permite manipular la secuencia seleccionada (con selSec(n)) */
    editSeq()   {
        log("Editando Secuencia "+this.seqActual);
        return this.secuencias[this.seqActual];
    }

    /** @param {BancoDeSecuencias} b BancoAsuar cargado como objeto JSON (sin métodos). Reemplazará el banco actual. */
    cargarBanco(b){
        this.clear();

        this.indice = b.indice == undefined ? 0 : b.indice;
        this.nombre = b.nombre == "" || b.nombre == undefined ? "[AsuarBank] " : b.nombre;

        log(`** Cargando banco ${b.nombre} (${b.secuencias.length} Secuencias)`);
        for(let s of b.secuencias){
            let sec = new SecuenciaAsuar();
            sec.cargarSecuencia(s);
            this.secuencias.push(sec);
        }
    }

    //SETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @param {string} n Nuevo nombre para el banco actual. */
    setNombre(n){       this.nombre = n;   }

    /** @param {number} i Índice del banco actual (relativo al Administrador de Bancos) */
    setIndice(i){       this.indice = i; }

    //GETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /**
     * @param {number} indx indice de la secuencia
     * @returns SecuenciaAsuar seleccionada del banco.  */
    getSeq(indx){       return this.secuencias[indx];}

    /** @returns {number} Cantidad de secuencias almacenadas en el BancoDeSecuencias. */
    getSize(){          return this.secuencias.length;}

    /** @returns {number} Retorna el índice del banco actual, relativo al Administrador de Bancos (0 - ...) */
    getIndice() {       return this.indice;}

    /** @returns {string} Retorna el nombre del Banco */
    getNombre(){        return this.nombre}

    getSecuenciaActualIndex(){ return this.seqActual;}

    print(){
        console.log();
        let separador = `|================= BANCO DE SECUENCIAS \'${this.nombre}\' =================|`;
        console.log( "+"+"=".repeat(separador.length-2)+"+\n"+ separador+"\n|"+"=".repeat(separador.length-2)+"|");

        let seqGuardadas = "   "+this.secuencias.length+" Secuencias  ";
        let bordes = (separador.length - seqGuardadas.length-2)/2;
        console.log("|"+" ".repeat(bordes )+seqGuardadas+" ".repeat(bordes )+" |");

        console.log("+"+"-".repeat(separador.length-2)+"+");
        for(let sq of this.secuencias){
            sq.print();
        }

        console.log();
        let finbanco= ` FIN BANCO \'${this.nombre}\'`;
        let bordeBajo = "=".repeat((separador.length-finbanco.length)/2)
        console.log(bordeBajo+finbanco+bordeBajo);
        console.log();
    }

    clear(){
        log(" * Limpiando BancoDeSecuencias...");
        this.secuencias = [];
    }

}

exports.BancoDeSecuencias=BancoDeSecuencias;

};

__modules['./AdministradorDeBancos.js'] = function(module, exports, __require){
var require = __require;
/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
 +=================================================================================*/

const {BancoDeSecuencias} = require("./BancoDeSecuencias.js");
const {log} = require('./util.js');

/**Clase AdministradorDeBancos
 * Reúne uno o varios BancosDeSecuencias. Permite exportarlos en formato JSON
 * así como también importarlos (reemplazando a los bancos pre-existentes).
 * La lectura/escritura de archivos se realiza mediante Persistencia (solo Node).
 * */
class AdministradorDeBancos{

    constructor(){
        log (" * AdministradorDeBancos constructor * ")

        this.bancos = [];
        this.JSONin = "";
        this.bancoActual = 0;
    }

    //METODOS PARA LA MANIPULACIÓN DE DATOS DE LOS BANCOS - - - - - - - - - - - - - - - - - - - - -
    /** @param {BancoDeSecuencias} b Banco de secuencias para agregar al final del arreglo */
    addBanco(b){
        this.bancos.push(b);
        this.selBanco( this.bancos.length-1 );
        this.bancos[this.bancoActual].setIndice(this.bancoActual);
        log("Nuevo BancoDeSecuencias insertado : id "+this.bancoActual+" (seleccionado)");

    }

    nuevoBanco(){
        this.bancos.push(new BancoDeSecuencias());
        this.selBanco( this.bancos.length-1 );
        this.bancos[this.bancoActual].setIndice(this.bancoActual);
        log("Nuevo BancoDeSecuencias creado : id "+this.bancoActual+" (seleccionado)");
    }

    getBancoActualIndex(){
        return this.bancoActual;
    }

    getBancoSecuencia(bancoIndex,seqIndex){
        log("Retornando secuencia "+seqIndex+" desde banco "+bancoIndex);
        return this.bancos[bancoIndex].getSeq(seqIndex);
    }

    /** @param {number} n indice del banco a manipular ( 0 a bancos.length ) */
    selBanco(n){
        if( n <= this.bancos.length -1 ){
            this.bancoActual = n;
            log(` Banco seleccionado : ${this.bancoActual} (de ${this.bancos.length-1})` );
        }else{
            console.error("ERROR : indice incorrecto para el banco. "+n+" ( "+typeof n+" )");}
    }

    /** @param {string} nombreBanco Nombre del banco a seleccionar. Si hay más de un banco con el mismo nombre seleccionará el primero. */
    selPorNombre(nombreBanco){
        for(let b of this.bancos){
            if(b.getNombre() == nombreBanco){
                this.selBanco(b.getIndice());
            }
        }
    }

    /** Permite manipular el banco seleccionado (con selBanco(n)) */
    editBanco()    {
        log("Editando banco "+this.bancoActual);
        return this.bancos[this.bancoActual]; }

    /** Elimina todos los BancosAsuar */
    clear(){
        log(" * Limpiando Administrador de bancos...")
        this.bancos = [];
        this.JSONin="";
    }

    print(){
        console.log();
        let separador = `######################## ADMINISTRADOR DE BANCOS ########################`;
        console.log( "#".repeat(separador.length)+"\n"+ separador+"\n"+"#".repeat(separador.length));

        let bancosGuardados = "   "+this.bancos.length+" Bancos de secuencias.  ";
        let bordes = (separador.length - bancosGuardados.length-2)/2;
        console.log("#"+" ".repeat(bordes )+bancosGuardados+" ".repeat(bordes )+" #");
    }

    //METODOS PARA EL USO DE JSON (SIN ARCHIVOS; para archivos usar Persistencia) - - - - - -
    /** @param {string} texto Texto JSON con los bancos de secuencias. */
    importarJSON(texto){
        this.JSONin = texto;
    }

    /** Compila el JSON cargado, reemplazando los bancos actuales. */
    compilarJSON(){
        let arregloBancos=JSON.parse(this.JSONin);
        this.bancos=[];
        log(" ~ COMPILANDO JSON, cargando bancos de secuencias... ~ ")
        for(let b of arregloBancos){
            let banco = new BancoDeSecuencias();
            banco.cargarBanco(b);
            this.bancos.push(banco);
        }
    }

    /** Carga un texto JSON con los BancosDeSecuencias y los compila en cascada (instanciando objetos BancoDeSecuencia, SecuenciaAsuar, NotaAsuar, AlturaAsuar y DuracionAsuar)
     * @param {string} texto Texto JSON con los BancosAsuar. */
    cargarJSON(texto){
        this.importarJSON(texto);
        this.compilarJSON();
    }

    /** @returns {string} Texto JSON con todos los bancos (para guardar en archivo, usar Persistencia.guardarAdmin). */
    exportarJSON(){
        log(" ~ EXPORTANDO JSON CON BANCOS ~")
        return JSON.stringify(this.bancos);
    }

    //GETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    getEtiquetasBancos(){
        let etiquetas = [];

        for(let b of this.bancos){
            etiquetas.push( b.getIndice() + " " + b.getNombre());
        }
        return etiquetas;
    }

    getEtiquetasSecuencias(){
        let etiquetas = [];

        for(let s of this.editBanco().secuencias){
            etiquetas.push( s.getIndice() + " " + s.getNombre());
        }
        return etiquetas;

    }

}

exports.AdministradorDeBancos = AdministradorDeBancos;

};

__modules['./EmuladorComdasuar.js'] = function(module, exports, __require){
var require = __require;
const {BancoDeSecuencias} = require("./BancoDeSecuencias.js");
const {AdministradorDeBancos} = require("./AdministradorDeBancos.js");
const Heuristicos = require('./Heuristicos.js');
const {log, setDebug} = require('./util.js');

class EmuladorComdasuar{

    /** @param {string} archivoJSON (opcional) Texto JSON con los bancos de secuencias.
     *  Si se entrega un archivo de disco, usar Persistencia.cargarAdmin(admin, ruta) (solo Node). */
    constructor(archivoJSON){
        log(" * EmuladorComdasuar constructor * ");
        this.ADMIN = new AdministradorDeBancos();
        if(archivoJSON == "" || archivoJSON == undefined || archivoJSON == null){
            this.ADMIN.addBanco(new BancoDeSecuencias() );
        }else{
            this.ADMIN.cargarJSON(archivoJSON);
        }
    }

    /** Activa o desactiva los logs de depuración internos de la librería. */
    static setDebug(estado){
        setDebug(estado);
    }

    /** Selecciona un banco desde el AdministradorDeBancos */
    selBanco(indice){       this.ADMIN.selBanco(indice);}
    /** Manipula el banco seleccionado (del AdministradorDeBancos) */
    editBanco(){            return this.ADMIN.editBanco();}

    nuevoBanco(){           this.ADMIN.nuevoBanco();        }
    /** Selecciona una secuencia desde el banco (actualmente seleccionado en el AdministradorDeBancos) */
    selSeq(indice){         this.ADMIN.editBanco().selSeq(indice);}
    /** Edita la secuencia seleccionada en el banco actual (desde AdministradorDeBancos) */
    editSeq(){              return this.ADMIN.editBanco().editSeq();}

    getBancoSecuencia(bancoI, seqI){    return this.ADMIN.getBancoSecuencia(bancoI, seqI);}

    /** Ingresa una nueva partitura al BancoDeSecuencias actual, a partir de la partitura ingresada en formato AMS.
     * @param {string} ams Partitura en formato AMS, que será ingresada en el banco actual. */
    nuevaPartituraAMS(ams){
        this.editBanco().addSeqAMS(ams);
    }

    /** Reemplaza la partitura de la secuencia seleccionada.
     * @param {string} ams Partitura en AMS para reemplazarla en la secuencia seleccionada. */
    reemplazarPartituraAMS(ams){
        let banco = this.editBanco();
        let indiceAnterior = this.editSeq().getIndice();
        let nombreAnterior = this.editSeq().getNombre();

        let nuevaSeq = BancoDeSecuencias.secuenciaDesdeAMS(ams);
        nuevaSeq.setIndex(indiceAnterior);
        nuevaSeq.setNombre(nombreAnterior);

        banco.setSeq(indiceAnterior, nuevaSeq);
        this.editSeq().print();
    }

    //Heuristicos
    transportarSeq(st){
        Heuristicos.transportar( this.editSeq() , st);
    }

    invertirSeq(eje){
        Heuristicos.invertir( this.editSeq() , eje);
    }

    retrogradarAlturasSeq(){
        Heuristicos.retrogradarAlturas( this.editSeq() );
    }

    retrogradarDuracionesSeq(){
        Heuristicos.retrogradarDuraciones( this.editSeq() );
    }

    desordenarAlturasSeq(){
        Heuristicos.desordenarAlturas(this.editSeq());
    }

    desordenarDuracionesSeq(){
        Heuristicos.desordenarDuraciones(this.editSeq());
    }

    expandirAlturasSeq(eje, escala){
        Heuristicos.expandirAlturas( this.editSeq(),eje, escala );
    }
    expandirDuracionesSeq(escala){
        Heuristicos.expandirDuraciones( this.editSeq(),escala );
    }
     /** Transmuta las alturas de la secuencia actualmente seleccionada (A), reemplazándolas con las alturas de la secuencia B (del mismo banco).
     * @param {number} seqIndice Índice identificador de la secuencia B (del mismo banco).  */
    transmutarAlturasSeq(seqBindice){
        Heuristicos.transmutarAlturas( this.editSeq(), this.editBanco().getSeq(seqBindice) );
    }
     /** Transmuta las alturas de la secuencia actualmente seleccionada (A), reemplazándolas con las alturas de la secuencia B (del mismo banco).
     * @param {number} seqIndice Índice identificador de la secuencia B (del mismo banco).  */
    transmutarDuracionesSeq(seqBindice){
        Heuristicos.transmutarDuraciones( this.editSeq(), this.editBanco().getSeq(seqBindice) );
    }
    /** Transmuta las alturas de la secuencia actualmente seleccionada (A), reemplazándolas con las alturas de la secuencia B (de cualquier banco).
     * @param {number} bankIndice indice identificador del banco de secuencias B
     * @param {number} seqIndice  indice identificador de la secuencia del banco B  */
    transmutarAlturasBankSeq(bankIndice, seqIndice){
        Heuristicos.transmutarAlturas( this.editSeq(), this.getBancoSecuencia(bankIndice,seqIndice) );
    }
    /** Transmuta las duraciones de la secuenca actualmente seleccionada (A), reemplazándolas con las duraciones de las secuencia B (de cualquier banco).
     * @param {number} bankIndice indice identificador del banco de secuencias B
     * @param {number} seqIndice  indice identificador de la secuencia del banco B  */
    transmutarDuracionesBankSeq(bankIndice, seqIndice){
        Heuristicos.transmutarDuraciones( this.editSeq(), this.getBancoSecuencia(bankIndice,seqIndice) );
    }
}

exports.EmuladorComdasuar = EmuladorComdasuar

};


window.EmuladorComdasuar = __require('./EmuladorComdasuar.js').EmuladorComdasuar;
window.AMSparser = __require('./AMSparser.js').AMSparser;
window.BancoDeSecuencias = __require('./BancoDeSecuencias.js').BancoDeSecuencias;
window.SecuenciaAsuar = __require('./SecuenciaAsuar.js').SecuenciaAsuar;
window.NotaAsuar = __require('./NotaAsuar.js').NotaAsuar;
window.DiccionarioAsuar = __require('./diccionarioAsuar.js').DiccionarioAsuar;
})();
