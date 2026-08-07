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
        this.octava         = {"1":24,  "2":36,     "3": 48,"4": 60,    "5": 72, "6": 84,"7":96 ,  "8":108          }
        this.notas 		    = {"C":0,   "D":2,      "E":4,  "F":5,      "G":7,   "A":9,  "B":11,   "R": -200        }
        this.alteraciones   = {"S":1,   "W":-1,     "Q":0,  "U":.5, "T":1.5,    "V":-.5, "R":1.5                    }

        this.ritmos		    = {"L":8000,"R":4000,   "B":2000,"N":1000,  "C":500, "S":250,"F":125,  "M":62.5, "P":0.5}
        //grupos irregulares: cada nota vale subdivs[n] * figura. "0" anula el grupo.
        //n = (n-1)/n (n figuras en el tiempo de n-1) salvo:
        //  6 = 2/3 (seisillo = doble tresillo: 6 en el tiempo de 4) y
        //  7 = 8/7 (septillo 7:8: 7 fusas en el tiempo de 8, una negra dividida en 7).
        this.subdivs 	    = {"0": 1,  "3":0.66666, "5":.8 , "6": 0.66666, "7":1.14286, "9":0.88888, "10":0.9, "11":0.90909, "12":0.91666, "13":0.92307, "14":0.92857, "15":0.93333, "16":0.9375}
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
        //prefijo numérico más largo presente en subdivs ("3", "7", "10", "16"...)
        let subdivPref = null;
        for (let len = 2; len >= 1; len--){
            if (this.subdivs[dur.slice(0, len)] !== undefined){
                subdivPref = dur.slice(0, len);
                break;
            }
        }

        if( subdivPref !== null){
            //sumamos duraciones una a una...
            let subdivision = parseFloat(this.subdivs[subdivPref]);

            for(let i = subdivPref.length; i < dur.length; i++){

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

