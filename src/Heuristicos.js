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
