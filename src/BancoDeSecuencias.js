/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/
const {SecuenciaAsuar} = require('./SecuenciaAsuar.js');
const {log} = require('./util.js');

/** Agrupa una o varias SecuenciasAsuar en una paleta musical de
 *  grupos (columnas) × secuencias. Los grupos son organizacionales: NO son
 *  pistas, y el banco NO es una línea de tiempo (la lógica de maqueta/timeline
 *  pertenece a clases futuras, nunca al banco).
 *
 *  Reglas de nombres por defecto:
 *   - Grupos:  grupo_A, grupo_B, ... (próxima letra no usada).
 *   - Secuencias: seq_1, seq_2, ... (base 1, POR GRUPO).
 *  Un banco nuevo tiene cero grupos; el primer addSeq crea y selecciona grupo_A.
 */
class BancoDeSecuencias{

    constructor(nombreBanco){
        log (" * BancoDeSecuencias constructor * ")

        this.nombre = nombreBanco == undefined || nombreBanco == "" ? "[AsuarBank] " : nombreBanco ;
        this.grupos = [];
        this.grupoActual = 0;
        this.seqActual = 0;
        this.indice = -1;
    }

    /** Crea una SecuenciaAsuar a partir de una partitura en formato AMS (sin
     *  agregarla al banco). Delega en SecuenciaAsuar.desdeAMS (pipeline único).
     * @param {string} ams Partitura en formato AMS.
     * @returns {SecuenciaAsuar} */
    static secuenciaDesdeAMS(ams){
        return SecuenciaAsuar.desdeAMS(ams);
    }

    /** @returns {boolean} true si `nombre` es un nombre de secuencia por defecto
     *  (vacío, "[AsuarSeq] " o "AsuarSeq_N"). Esos reciben el nombre nuevo. */
    static esNombreSeqPorDefecto(nombre){
        if(typeof nombre !== "string") return true;
        const t = nombre.trim();
        return t === "" || t === "[AsuarSeq]" || /^AsuarSeq(_\d+)?$/.test(t);
    }

    //METODOS PARA LA MANIPULACION DE DATOS DE LAS SECUENCIAS - - - - - - - - - - - - - - - //
    /** @param {SecuenciaAsuar} seq Recibe una SecuenciaAsuar (obj) y lo añade al
     *  grupo activo. Si el banco no tiene grupos, crea y selecciona uno (grupo_A).
     *  @returns {SecuenciaAsuar} La secuencia añadida.  */
    addSeq(seq){
        const grupo = this._grupoActivoODefecto();
        grupo.secuencias.push(seq);
        this._reindexarGrupo(grupo);

        this.selSeq(grupo.secuencias.length - 1);

        if(BancoDeSecuencias.esNombreSeqPorDefecto(seq.getNombre())){
            seq.setNombre("seq_" + (grupo.secuencias.length));
        }
        return seq;
    }

    /** @param {string} amsSeq Recibe una partitura en formato AMS, la convierte
     *  en una SecuenciaAsuar y luego será añadida al grupo activo. */
    addSeqAMS(amsSeq) {
        this.addSeq(BancoDeSecuencias.secuenciaDesdeAMS(amsSeq)); //la agrega al banco
    }

    /** @param {number} indice indice de la secuencia a reemplazar (del grupo activo)
     *  @param {SecuenciaAsuar} seq nueva secuencia que ocupará la posición */
    setSeq(indice, seq){
        const grupo = this._grupoActivo();
        if(!grupo || !grupo.secuencias[indice]) return;
        grupo.secuencias[indice] = seq;
        this.selSeq(indice);
    }

    /** @param {number} n indice de la secuencia a manipular (del grupo activo, 0 a secuencias.length) */
    selSeq(n){
        const grupo = this._grupoActivo();
        if(grupo && n >= 0 && n <= grupo.secuencias.length - 1){
            this.seqActual = n;
            log(` Secuencia seleccionada : ${this.seqActual} (de ${grupo.secuencias.length-1})` );
        }else{
            console.error("ERROR : indice incorrecto para la secuencia. "+n+" ( "+typeof n+" )");
        }
    }

    /** Elimina la secuencia del índice indicado (del grupo activo) y reindexa las restantes.
     *  @param {number} indice índice de la secuencia a eliminar.
     *  @returns {boolean} true si se eliminó. */
    deleteSeq(indice){
        const grupo = this._grupoActivo();
        if(!grupo || indice < 0 || indice >= grupo.secuencias.length) return false;
        grupo.secuencias.splice(indice, 1);
        this._reindexarGrupo(grupo);
        if (this.seqActual >= grupo.secuencias.length){
            this.seqActual = Math.max(0, grupo.secuencias.length - 1);
        }
        log(` Secuencia ${indice} eliminada (quedan ${grupo.secuencias.length})`);
        return true;
    }

    /** Duplica la secuencia del índice indicado (del grupo activo) y la agrega
     *  al final del grupo. La copia se llama `<nombre>_copia` (p. ej. seq_1_copia).
     *  @param {number} indice índice de la secuencia a copiar.
     *  @returns {SecuenciaAsuar|null} la copia creada, o null si el índice no existe. */
    duplicarSeq(indice){
        const original = this.getSeq(indice);
        if (!original) return null;
        const copia = original.clone();
        copia.setNombre((original.getNombre() || "seq") + "_copia");
        this.addSeq(copia);
        return copia;
    }

    /** @param {string} nombreSeq Nombre de la secuencia a seleccionar (en el grupo activo).
     *  Si hay más de una secuencia con el mismo nombre seleccionará la primera. */
    selPorNombre(nombreSeq){
        const grupo = this._grupoActivo();
        if(!grupo) return;
        for(let s of grupo.secuencias){
            if (s.getNombre()==nombreSeq){
                this.selSeq(s.getIndice());
            }
        }
    }

    /** Permite manipular la secuencia seleccionada (del grupo activo) */
    editSeq()   {
        log("Editando Secuencia "+this.seqActual);
        const grupo = this._grupoActivo();
        return grupo ? grupo.secuencias[this.seqActual] : undefined;
    }

    /** @param {BancoDeSecuencias} b BancoAsuar cargado como objeto JSON (sin métodos). Reemplazará el banco actual.
     *  Acepta el formato nuevo `{grupos:[{nombre, secuencias:[...]}]}` y el formato
     *  legacy `{secuencias:[...]}` (se envuelve en un solo grupo). */
    cargarBanco(b){
        this.clear();

        this.indice = b.indice == undefined ? 0 : b.indice;
        this.nombre = b.nombre == "" || b.nombre == undefined ? "[AsuarBank] " : b.nombre;

        if(Array.isArray(b.grupos)){
            for(let g of b.grupos){
                const grupo = {nombre: g.nombre || this._proximaLetraGrupo(), secuencias: []};
                for(let s of (g.secuencias || [])){
                    let sec = new SecuenciaAsuar();
                    sec.cargarSecuencia(s);
                    grupo.secuencias.push(sec);
                }
                this.grupos.push(grupo);
            }
        }else if(Array.isArray(b.secuencias)){
            //formato legacy: una lista plana -> un solo grupo
            const grupo = {nombre: "grupo_A", secuencias: []};
            for(let s of b.secuencias){
                let sec = new SecuenciaAsuar();
                sec.cargarSecuencia(s);
                grupo.secuencias.push(sec);
            }
            this.grupos.push(grupo);
        }

        this.grupoActual = 0;
        this.seqActual = 0;
        for(const g of this.grupos){
            this._reindexarGrupo(g);
            g.secuencias.forEach((s, i) => {
                if(BancoDeSecuencias.esNombreSeqPorDefecto(s.getNombre())){
                    s.setNombre("seq_" + (i + 1));
                }
            });
        }
        log(`** Cargando banco ${b.nombre} (${this.getSize()} Secuencias, ${this.grupos.length} grupos)`);
    }

    //METODOS PARA LA MANIPULACION DE LOS GRUPOS - - - - - - - - - - - - - - - - - - - - //
    /** Crea un nuevo grupo (nombre por defecto grupo_A, grupo_B, ...), lo agrega
     *  al final y lo selecciona.
     *  @returns {number} índice del grupo creado. */
    nuevoGrupo(){
        const nombre = "grupo_" + this._proximaLetraGrupo();
        this.grupos.push({nombre: nombre, secuencias: []});
        this.grupoActual = this.grupos.length - 1;
        this.seqActual = 0;
        log(` Nuevo grupo '${nombre}' creado (id ${this.grupoActual}, seleccionado)`);
        return this.grupoActual;
    }

    /** Elimina el grupo del índice indicado. Si era el último, el banco queda en
     *  blanco (cero grupos; el próximo addSeq volverá a crear uno).
     *  @param {number} indice índice del grupo a eliminar.
     *  @returns {boolean} true si se eliminó. */
    deleteGrupo(indice){
        if(indice < 0 || indice >= this.grupos.length) return false;
        this.grupos.splice(indice, 1);
        if(this.grupoActual >= this.grupos.length){
            this.grupoActual = Math.max(0, this.grupos.length - 1);
        }
        this.seqActual = 0;
        log(` Grupo ${indice} eliminado (quedan ${this.grupos.length})`);
        return true;
    }

    /** @param {number} n indice del grupo a seleccionar. */
    selGrupo(n){
        if(n >= 0 && n <= this.grupos.length - 1){
            this.grupoActual = n;
            this.seqActual = 0;
            log(` Grupo seleccionado : ${this.grupoActual} (de ${this.grupos.length-1})`);
        }else{
            console.error("ERROR : indice incorrecto para el grupo. "+n+" ( "+typeof n+" )");
        }
    }

    /** @param {number} indice índice del grupo a renombrar. */
    setGrupoNombre(indice, nombre){
        if(this.grupos[indice] && nombre != undefined && String(nombre).trim() !== ""){
            this.grupos[indice].nombre = String(nombre);
        }
    }

    //GETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @returns {Array} copia de los grupos [{nombre, size, indice}]. */
    getGrupos(){
        return this.grupos.map((g, i) => ({nombre: g.nombre, size: g.secuencias.length, indice: i}));
    }

    getSizeGrupos(){ return this.grupos.length; }

    getGrupoActualIndex(){ return this.grupoActual; }

    //API POR COORDENADAS (grupo, indice) - - - - - - - - - - - - - - - - - - - - //
    /** @param {number} g indice del grupo.
     *  @param {number} i indice de la secuencia dentro del grupo.
     *  @returns {SecuenciaAsuar|undefined} */
    getSeqG(g, i){
        const grupo = this.grupos[g];
        return grupo ? grupo.secuencias[i] : undefined;
    }

    /** Agrega una partitura AMS al grupo `g` (lo selecciona).
     *  @returns {SecuenciaAsuar|null} la secuencia creada. */
    addSeqGrupoAMS(g, ams){
        if(!this.grupos[g]) return null;
        this.selGrupo(g);
        return this.addSeqAMS(ams);
    }

    /** Selecciona una secuencia por coordenadas (grupo, indice). */
    selSeqGrupo(g, i){
        this.selGrupo(g);
        this.selSeq(i);
    }

    /** Edita una secuencia por coordenadas (grupo, indice).
     *  @returns {SecuenciaAsuar|undefined} */
    editSeqGrupo(g, i){
        this.selSeqGrupo(g, i);
        return this.editSeq();
    }

    /** @returns {SecuenciaAsuar[]} todas las secuencias del banco (aplanadas, en
     *  orden de grupos). */
    flatten(){
        const out = [];
        for(const g of this.grupos){
            for(const s of g.secuencias) out.push(s);
        }
        return out;
    }

    //SETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @param {string} n Nuevo nombre para el banco actual. */
    setNombre(n){       this.nombre = n;   }

    /** @param {number} i Índice del banco actual (relativo al Administrador de Bancos) */
    setIndice(i){       this.indice = i; }

    //GETTERS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    /** @param {number} indx indice de la secuencia (del grupo activo)
     *  @returns SecuenciaAsuar seleccionada del banco.  */
    getSeq(indx){       const g = this._grupoActivo(); return g ? g.secuencias[indx] : undefined;}

    /** @returns {number} Cantidad total de secuencias del banco (todos los grupos). */
    getSize(){
        return this.grupos.reduce((a, g) => a + g.secuencias.length, 0);
    }

    /** @returns {number} Retorna el índice del banco actual, relativo al Administrador de Bancos (0 - ...) */
    getIndice() {       return this.indice;}

    /** @returns {string} Retorna el nombre del Banco */
    getNombre(){        return this.nombre}

    getSecuenciaActualIndex(){ return this.seqActual;}

    print(){
        console.log();
        let separador = `|================= BANCO DE SECUENCIAS \'${this.nombre}\' =================|`;
        console.log( "+"+"=".repeat(separador.length-2)+"+\n"+ separador+"\n|"+"=".repeat(separador.length-2)+"|");

        let seqGuardadas = "   "+this.getSize()+" Secuencias en "+this.grupos.length+" grupos  ";
        let bordes = (separador.length - seqGuardadas.length-2)/2;
        console.log("|"+" ".repeat(bordes )+seqGuardadas+" ".repeat(bordes )+" |");

        for(let g of this.grupos){
            console.log("+"+"-".repeat(separador.length-2)+"+");
            console.log("| GRUPO '" + g.nombre + "' (" + g.secuencias.length + " secuencias) |");
            for(let sq of g.secuencias){
                sq.print();
            }
        }

        console.log();
        let finbanco= ` FIN BANCO \'${this.nombre}\'`;
        let bordeBajo = "=".repeat((separador.length-finbanco.length)/2)
        console.log(bordeBajo+finbanco+bordeBajo);
        console.log();
    }

    clear(){
        log(" * Limpiando BancoDeSecuencias...");
        this.grupos = [];
        this.grupoActual = 0;
        this.seqActual = 0;
    }

    //PRIVADOS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
    _grupoActivo(){
        return this.grupos[this.grupoActual];
    }

    _grupoActivoODefecto(){
        if(this.grupos.length === 0){
            this.nuevoGrupo();
        }
        return this._grupoActivo();
    }

    _reindexarGrupo(grupo){
        grupo.secuencias.forEach((s, i) => s.setIndex(i));
    }

    _proximaLetraGrupo(){
        const usadas = new Set(this.grupos.map((g) => g.nombre));
        for(const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ"){
            if(!usadas.has("grupo_" + c)) return c;
        }
        let i = this.grupos.length + 1;
        while(usadas.has("grupo_" + i)) i++;
        return String(i);
    }

}

exports.BancoDeSecuencias=BancoDeSecuencias;
