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

    /** Elimina el banco del índice indicado y reindexa los restantes.
     *  Si no queda ningún banco, se crea automáticamente uno vacío para que
     *  editBanco()/selBanco() sigan funcionando.
     *  @param {number} indice índice del banco a eliminar.
     *  @returns {boolean} true si se eliminó. */
    deleteBanco(indice){
        if (indice < 0 || indice >= this.bancos.length) return false;
        this.bancos.splice(indice, 1);
        this.bancos.forEach((b, i) => b.setIndice(i));
        if (this.bancos.length === 0){
            this.bancos.push(new BancoDeSecuencias());
            this.bancos[0].setIndice(0);
        }
        if (this.bancoActual >= this.bancos.length){
            this.bancoActual = this.bancos.length - 1;
        }
        log(` Banco ${indice} eliminado (quedan ${this.bancos.length})`);
        return true;
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
