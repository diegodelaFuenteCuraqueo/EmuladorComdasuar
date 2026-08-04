/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
 +=================================================================================*/

const {getDiccionarioAsuar} = require('./diccionarioAsuar.js');
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

        //compás opcional "[NNNN]", "[NP.N]", "[5/8]", "[3+2/8]" (solo metadata)
        this.compas = null;

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
        let ultimaOctava = "";

        for(let i = 0; i < this.AMSalturas.length;i++){
            //aplicamos redundancias de octavas (y resolvemos acordes/desplazamientos)
            let resuelta = this.resolverAltura(this.AMSalturas[i], ultimaOctava);
            ultimaOctava = resuelta.octava;

            this.codigoPlano.alturas.push(resuelta.codigo);

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

            log(this.AMSalturas[i]+" "+this.AMSduraciones[i]+" => "+resuelta.codigo+" "+duracionConTodosLosDatos );
        }

    }

    /** Resuelve un token de altura (AMS) a su forma canónica plana, aplicando
     *  redundancias de octava, desplazamientos (<, >, <<, >>) y acordes (con
     *  puntos o concatenados: "4C.E.G.>C" ≡ "4CEG>C" ≡ "4CEG5C").
     *  @param {String} raw token de altura sin espacios (ya en mayúsculas).
     *  @param {String} ultimaOctava octava heredada del evento anterior ("" si no hay).
     *  @returns {{codigo:String, octava:String}} "codigo" = alturas normalizadas
     *    separadas por "." (ej. "4C.4E.4G.5C"); "octava" = nueva octava global
     *    heredada (solo cambia si la 1ª nota del evento trae octava explícita).
     *  Reglas de "R": sola = silencio; tras una nota = alteración (+1.5 semitonos);
     *  cualquier otro uso (tras octava, como nota dentro de un acorde, como segunda
     *  alteración, tras un desplazamiento) lanza un Error. */
    resolverAltura(raw, ultimaOctava){
        if(raw === "R"){ return {codigo:"R", octava: ultimaOctava}; }
        if(typeof raw !== "string" || raw === ""){ throw new Error("AMS: altura vacía en '"+raw+"'."); }

        const octavas = "12345678";
        const notas = "ABCDEFG";
        const alteraciones = "SWQUTVR";

        let octavaLocal = ultimaOctava === "" ? null : parseInt(ultimaOctava, 10);
        let primeraExplicita = null;
        let primeraNota = true;
        const pitches = [];
        let i = 0;

        while(i < raw.length){

            //separador de acorde (sin huecos vacíos: ni al inicio, ni doble, ni al final)
            if(raw[i] === "."){
                if(pitches.length === 0 || i + 1 >= raw.length || raw[i+1] === "."){
                    throw new Error("AMS: separador de acorde mal ubicado en '"+raw+"'.");
                }
                i++;
                continue;
            }

            //desplazamiento(s) de octava (<, >)
            let desplazamiento = 0;
            while(raw[i] === ">" || raw[i] === "<"){
                desplazamiento += (raw[i] === ">") ? 1 : -1;
                i++;
            }

            //octava explícita
            let octavaExplicita = null;
            if(raw[i] !== undefined && octavas.includes(raw[i])){
                octavaExplicita = parseInt(raw[i], 10);
                i++;
            }

            //nota (la R no puede ocupar el lugar de la nota dentro de un evento)
            const nota = raw[i];
            if(nota === "R"){
                throw new Error("AMS: 'R' debe ir sola (silencio) o como alteración tras una nota; en '"+raw+"'.");
            }
            if(nota === undefined || !notas.includes(nota)){
                throw new Error("AMS: altura no reconocida en '"+raw+"' (después de '"+raw.slice(0, i)+"').");
            }
            i++;

            //alteración opcional (la R tras una nota = +1.5 semitonos)
            let alteracion = "";
            if(alteraciones.includes(raw[i])){
                alteracion = raw[i];
                i++;
            }

            if(octavaExplicita !== null){
                octavaLocal = octavaExplicita;
                if(primeraNota){ primeraExplicita = octavaExplicita; }
            }

            //la octava efectiva = heredada/explícita + desplazamiento (limitada a 1..8)
            let octava = octavaExplicita !== null ? octavaExplicita : octavaLocal;
            octava = octava === null ? null : Math.max(1, Math.min(8, octava + desplazamiento));

            pitches.push(octava === null ? (nota + alteracion) : (octava + nota + alteracion));
            primeraNota = false;
        }

        if(pitches.length === 0){
            throw new Error("AMS: altura no reconocida '"+raw+"'.");
        }

        //la octava global se hereda solo de la 1ª nota explícita del evento
        return {codigo: pitches.join("."), octava: primeraExplicita !== null ? String(primeraExplicita) : ultimaOctava};
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

            //el elemento es una firma de tiempo [..] (solo metadata) -------------------------------//
            if(codigoActual[0] == "["){
                this.compas = AMSparser.parseCompas(codigoActual);
                log(" * Firma de tiempo : "+JSON.stringify(this.compas));
                continue;
            }

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
     * @returns {Object} { alturas: string[], duraciones: string[], tempo: Object, compas: Object|null } */
    parse(amsString){
        this.cargarPartitura(amsString);
        this.compilar();
        return {
            alturas: this.codigoPlano.alturas,
            duraciones: this.codigoPlano.duraciones,
            tempo: this.tempo,
            compas: this.compas
        };
    }

    /** @returns {Object|null} La firma de tiempo detectada en la última partitura (o null). */
    getCompas(){ return this.compas; }

    /** Interpreta y valida una firma de tiempo "[...]" (solo metadata: nunca produce notas).
     *
     *  Formas aceptadas:
     *   - Figurada:  "[NNNN]" (4/4), "[NP.N]" y "[NPN]" (5/8 en 3+2), "[CCCCC]" (5/8),
     *                "[CN]" (3/8). Cada figura con sus "P" es una agrupación; las
     *                agrupaciones se separan con "." (opcional: sin puntos, cada
     *                figura empieza una agrupación y "P" se adhiere a la anterior).
     *   - Fracción:  "[5/8]" -> numerador/denominador directos, sin agrupación.
     *   - Fracción agrupada: "[3+2/8]" -> 5/8 agrupado 3+2 (la suma de las partes
     *                es el numerador y cada parte es una agrupación).
     *
     *  Para la forma figurada se deriva numerador/denominador con la regla del
     *  mínimo común denominador: denominador = 4 * subdivisión, numerador =
     *  total * subdivisión, agrupación = cuartos de cada grupo * subdivisión.
     *
     * @param {string} token Palabra completa "[...]".
     * @returns {Object} {texto, grupos|null, duraciones|null, numerador, denominador, agrupacion|null}
     * @throws {Error} Si la firma de tiempo es inválida. */
    static parseCompas(token){
        if(typeof token !== "string" || token[0] !== "[" || token[token.length-1] !== "]" || token.length < 3){
            throw new Error("AMS: compás mal formado en '"+token+"'.");
        }
        const contenido = token.slice(1, -1);
        if(contenido === ""){
            throw new Error("AMS: compás vacío en '"+token+"'.");
        }

        //forma fraccionaria: [5/8] o [3+2/8] ------------------------------------------------//
        if(contenido.includes("/")){
            if(!/^\d+(\+\d+)*\/(\d+)$/.test(contenido)){
                throw new Error("AMS: fracción de compás inválida en '"+token+"'.");
            }
            const [numeradorTexto, denominadorTexto] = contenido.split("/");
            const partes = numeradorTexto.split("+").map((s) => parseInt(s, 10));
            if(partes.length === 0 || partes.some((p) => Number.isNaN(p) || p < 1)){
                throw new Error("AMS: agrupación de compás inválida en '"+token+"'.");
            }
            const denominador = parseInt(denominadorTexto, 10);
            if(![1, 2, 4, 8, 16, 32, 64].includes(denominador)){
                throw new Error("AMS: denominador de compás inválido (potencia de 2) en '"+token+"'.");
            }
            return {
                texto: token,
                grupos: null,
                duraciones: null,
                numerador: partes.reduce((a, b) => a + b, 0),
                denominador: denominador,
                agrupacion: partes.length > 1 ? partes : null,
            };
        }

        //forma figurada: [NNNN], [NP.N], [NPN], [CCCCC] -------------------------------------//
        const FIGURAS_COMPAS = "LRBNCSFM";
        const grupos = [];
        let grupoActual = null;
        let puntoAnterior = false;
        for(const c of contenido){
            if(c === "."){
                if(grupoActual === null || puntoAnterior){
                    throw new Error("AMS: separador de agrupación mal ubicado en '"+token+"'.");
                }
                puntoAnterior = true;
                continue;
            }
            if(c === "P"){
                if(grupoActual === null || puntoAnterior){
                    throw new Error("AMS: puntillo sin figura previa en '"+token+"'.");
                }
                grupoActual.puntillos++;
                puntoAnterior = false;
                continue;
            }
            if(FIGURAS_COMPAS.includes(c)){
                grupoActual = {figura: c, puntillos: 0};
                grupos.push(grupoActual);
                puntoAnterior = false;
                continue;
            }
            throw new Error("AMS: figura de compás no reconocida ('"+c+"') en '"+token+"'.");
        }
        if(puntoAnterior){
            throw new Error("AMS: agrupación incompleta (termina en '.') en '"+token+"'.");
        }
        if(grupos.length === 0){
            throw new Error("AMS: compás sin agrupaciones en '"+token+"'.");
        }

        //duración en cuartos de negra de cada agrupación (figura + puntillos)
        const dict = getDiccionarioAsuar();
        const cuartos = grupos.map((g) => {
            let q = dict.ritmos[g.figura] / 1000;
            let dot = q * 0.5;
            for(let k = 0; k < g.puntillos; k++){
                q += dot;
                dot /= 2;
            }
            return q;
        });

        //regla del mínimo común denominador (potencia de 2 más fina que integra cada grupo)
        let subdiv = 1;
        for(const q of cuartos){
            let ss = 1;
            while(Math.abs(q * ss - Math.round(q * ss)) > 1e-6) ss *= 2;
            subdiv = Math.max(subdiv, ss);
        }

        return {
            texto: token,
            grupos: grupos.map((g) => ({figura: g.figura, puntillo: g.puntillos})),
            duraciones: cuartos,
            numerador: Math.round(cuartos.reduce((a, b) => a + b, 0) * subdiv),
            denominador: 4 * subdiv,
            agrupacion: cuartos.map((q) => Math.round(q * subdiv)),
        };
    }

    /** @param {string} token Palabra completa "[...]".
     *  @returns {boolean} true si es una firma de tiempo válida. */
    static validarCompas(token){
        try{
            AMSparser.parseCompas(token);
            return true;
        }catch(e){
            return false;
        }
    }

}

exports.AMSparser = AMSparser;
/*
const {AMSparser} = require('./AMSparser.js');
let AMSparser = new AMSparser();
*/
