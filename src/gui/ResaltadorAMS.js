/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

const {getDiccionarioAsuar} = require('../diccionarioAsuar.js');
const {AMSparser} = require('../AMSparser.js');

/** Clasifica cada "palabra" del texto para colorear el código Asuar (AMS):
 *
 *   - 'modo'     -> comandos J.. y sus argumentos                            [púrpura]
 *   - 'tempo'    -> cambio de tempo (N=60, B=90.5)                           [amarillo]
 *   - 'compas'   -> firma de tiempo "[NNNN]", "[5/8]", "[3+2/8]"            [amarillo]
 *   - 'altura'   -> una altura/resto en posición de altura                   [verde]
 *   - 'duracion' -> una duración en posición de duración                     [azul]
 *   - 'repetir'  -> el operador "/" (repite la altura/duración anterior)
 *   - 'error'    -> una palabra que no encaja en la posición en que aparece  [rojo]
 *   - 'texto'    -> espacios y saltos de línea (sin color)
 *
 * La clasificación sigue el mismo estado que AMSparser.compilar(): los modos
 * J0 (altura duración), J1 (duración constante -> solo alturas) y J2 (altura
 * constante -> solo duraciones). El alfabeto (notas, alteraciones, ritmos,
 * octavas, subdivisones) se toma del diccionario para no duplicarlo. */
class ResaltadorAMS{

    constructor(){
        const dict = getDiccionarioAsuar();
        this.octavas = Object.keys(dict.octava).join("");
        this.notas = Object.keys(dict.notas).join("").replace("R", "");
        this.alteraciones = Object.keys(dict.alteraciones).join("");
        this.figuras = Object.keys(dict.ritmos).join("").replace("P", "");
        //grupos irregulares en una alternancia ordenada por longitud ("16"|"15"|...|"10"|"9"|...)
        this.grupos = Object.keys(dict.subdivs).sort((a, b) => b.length - a.length).join("|");
        this.regexDuracion = new RegExp("^(?:" + this.grupos + ")?[" + this.figuras + "]+P*$");
    }

    /** Resalta un texto AMS.
     *  @param {string} texto Código Asuar (AMS) con espacios y saltos de línea.
     *  @returns {Array<{tipo:string, texto:string}>} Segmentos contiguos que
     *    reconstruyen exactamente el texto de entrada (mayúsculas y espacios
     *    tal como fueron escritos). */
    resaltar(texto){
        if (typeof texto !== "string") texto = String(texto == null ? "" : texto);

        const segmentos = [];
        let modo = 0;          //0 = J0 (altura/duración), 1 = J1, 2 = J2
        let pendienteAltura = true;
        let argsPendientes = 0;

        //divide conservando los espacios y saltos de línea
        const partes = texto.split(/(\s+)/);

        for (const parte of partes){
            if (parte === "") continue;

            //blanco / salto de línea
            if (/^\s+$/.test(parte)){
                segmentos.push({tipo: "texto", texto: parte});
                continue;
            }

            const palabra = parte.toUpperCase();
            let tipo;

            //comando de modo J.. (y sus argumentos) --------------------------------
            if (/^J\d+$/.test(palabra)){
                tipo = "modo";
                argsPendientes = this.argsDeModo(palabra);
                if (palabra === "J0") modo = 0;
                else if (palabra === "J1") modo = 1;
                else if (palabra === "J2") modo = 2;
            }else if (argsPendientes > 0){
                tipo = "modo";
                argsPendientes--;
            }else if (palabra.includes("=")){   //cambio de tempo (ej. N=60)
                tipo = /^[A-Z]+=[0-9]+(?:\.[0-9]+)?$/.test(palabra) ? "tempo" : "error";
            }else if (palabra[0] === "["){       //firma de tiempo (ej. [NNNN], [3+2/8])
                tipo = AMSparser.validarCompas(palabra) ? "compas" : "error";
            }else if (palabra === "/"){          //repite la nota/duración anterior
                tipo = "repetir";
                if (modo === 0) pendienteAltura = !pendienteAltura;   //ocupa un hueco del par altura/duración
            }else{
                //palabra de nota o duración según el modo activo --------------------
                if (modo === 1){
                    tipo = this.esRest(palabra) || this.esAltura(palabra)
                        ? "altura" : "error";
                }else if (modo === 2){
                    tipo = this.esDuracion(palabra) ? "duracion" : "error";
                }else{
                    if (pendienteAltura){
                        tipo = this.esRest(palabra) || this.esAltura(palabra)
                            ? "altura" : "error";
                        pendienteAltura = false;
                    }else{
                        tipo = this.esDuracion(palabra) ? "duracion" : "error";
                        pendienteAltura = true;
                    }
                }
            }

            segmentos.push({tipo, texto: parte});
        }

        return segmentos;
    }

    /** Cantidad de argumentos que consume cada comando de modo. */
    argsDeModo(palabra){
        switch (palabra[1]){
            case "1": return 1;   //J1 ritmo constante -> duración
            case "2": return 1;   //J2 altura constante -> altura
            case "4": return 1;   //J4 repeticiones
            case "5": return 2;   //J5 desde, hasta
            default:  return 0;   //J0, J3, J6, J7...
        }
    }

    /** ¿Es un silencio ("R" solo) en posición de altura? */
    esRest(token){
        return typeof token === "string" && token.trim().toUpperCase() === "R";
    }

    /** ¿Es una altura válida? Acepta acordes separados por "." (con el mismo
     *  "." opcional del parser), desplazamientos <, >, <<, >>, octava 1..8 y
     *  una alteración (S W Q U T V, o R tras la nota). No acepta separadores
     *  vacíos ("4C..E") ni "R" como nota dentro del evento. */
    esAltura(token){
        if (typeof token !== "string") return false;
        const palabra = token.trim().toUpperCase();
        if (palabra === "" || palabra === "R") return false;

        //un solo separador entre partes, sin huecos vacíos
        if (palabra[0] === "." || palabra[palabra.length - 1] === "." || palabra.includes("..")) return false;

        let i = 0;
        while (i < palabra.length){
            //separador de acorde opcional (nunca al inicio)
            if (i > 0 && palabra[i] === ".") i++;

            //desplazamientos (0 a 2 signos)
            let desplazamientos = 0;
            while (palabra[i] === "<" || palabra[i] === ">"){
                desplazamientos++;
                i++;
            }
            if (desplazamientos > 2) return false;

            //octava opcional
            if (palabra[i] !== undefined && this.octavas.includes(palabra[i])) i++;

            //nota (la R no puede ser la nota)
            const nota = palabra[i];
            if (nota === undefined || !this.notas.includes(nota)) return false;
            i++;

            //alteración opcional
            if (palabra[i] !== undefined && this.alteraciones.includes(palabra[i])) i++;

            //si queda algo, debe empezar otra altura del acorde (con o sin "."):
            //desplazamiento, octava o nota (la concatenación "4CrEG" no usa puntos)
            if (i < palabra.length){
                const c = palabra[i];
                if (c !== "." && c !== "<" && c !== ">" && !this.octavas.includes(c) && !this.notas.includes(c)){
                    return false;
                }
            }
        }
        return true;
    }

    /** ¿Es una duración válida? Grupo irregular opcional (0/3/5/6/7/9/10...16) + al menos
     *  una figura (L R B N C S F M) y puntos "P" opcionales. */
    esDuracion(token){
        if (typeof token !== "string") return false;
        return this.regexDuracion.test(token.trim().toUpperCase());
    }
}

exports.ResaltadorAMS = ResaltadorAMS;
