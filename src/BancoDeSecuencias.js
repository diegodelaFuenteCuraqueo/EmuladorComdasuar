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

    /** Elimina la secuencia del índice indicado y reindexa las restantes.
     *  @param {number} indice índice de la secuencia a eliminar.
     *  @returns {boolean} true si se eliminó. */
    deleteSeq(indice){
        if (indice < 0 || indice >= this.secuencias.length) return false;
        this.secuencias.splice(indice, 1);
        this.secuencias.forEach((s, i) => s.setIndex(i));
        if (this.seqActual >= this.secuencias.length){
            this.seqActual = Math.max(0, this.secuencias.length - 1);
        }
        log(` Secuencia ${indice} eliminada (quedan ${this.secuencias.length})`);
        return true;
    }

    /** Duplica la secuencia del índice indicado y la agrega al final del banco.
     *  @param {number} indice índice de la secuencia a copiar.
     *  @returns {SecuenciaAsuar|null} la copia creada, o null si el índice no existe. */
    duplicarSeq(indice){
        const original = this.secuencias[indice];
        if (!original) return null;
        const copia = original.clone();
        copia.setNombre((original.getNombre() || "Seq") + "_copia");
        this.addSeq(copia);
        return copia;
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
