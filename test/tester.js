const {AMSparser} = require('../src/AMSparser.js');
const {DiccionarioAsuar, getDiccionarioAsuar} = require('../src/diccionarioAsuar.js');
const {SecuenciaAsuar} = require("../src/SecuenciaAsuar.js");
const {BancoDeSecuencias} = require("../src/BancoDeSecuencias.js");
const {AdministradorDeBancos} = require("../src/AdministradorDeBancos.js");
const {NotaAsuar} = require('../src/NotaAsuar.js');
const {EmuladorComdasuar} = require("../src/EmuladorComdasuar.js");
const Persistencia = require("../src/Persistencia.js");
const {setDebug} = require('../src/util.js');

const fs  = require('fs');

setDebug(true); // activa logs de depuración de la librería durante el test

let COMPILADOR;
let ADMIN = new AdministradorDeBancos();
ADMIN.addBanco(new BancoDeSecuencias());

function cargarArchivo(file){
    return fs.readFileSync(file, 'utf8');
}

function testParser(){

    let partituras= fs.readdirSync("./test/scores");
    console.log(partituras.length+" archivos txt cargados.\n")

    for(let partitura of partituras){

        let txt = cargarArchivo("./test/scores/"+partitura);

        //compilamos la partitura y creamos la secuencia con la nueva API
        console.log("\nCargando "+partitura+"- - - - - - - - - - - - - - - -");
        console.log(txt);

        let seq = BancoDeSecuencias.secuenciaDesdeAMS(txt);
        seq.setNombre(partitura);
        ADMIN.bancos[0].addSeq(seq);

        //imprime tabla con notas e info de seqs
        let out = [];
        for(let x = 0; x < seq.getNotas().length; x++){
            let n = seq.getNota(x);
            out.push({
                " nota ": n.getAMSalt(),
                "   dur. ": n.getAMSdur(),
                " MIDICENT": n.getMidicent(),
                " DUR (MS.)": n.getMS()
            });
        }
        console.table(out);
        seq.print()

        console.log("mc : "+seq.getMidicents()+"\ndur: "+seq.getDuraciones()+"\nini: "+seq.getInicios()+"\n");

        console.log("Listas en formato BACH : \nAlturas:   "+seq.getBachMidicents());
        console.log("Inicios:   "+seq.getBachInicios());
        console.log("Duracioes: "+seq.getBachDuraciones());
    }
}

let comdasuar = new EmuladorComdasuar();
function tester2(){
    let partituras= fs.readdirSync("./test/scores");;
    console.log(partituras.length+" archivos txt cargados.\n")

    for(let partitura of partituras){
        let txt = cargarArchivo("./test/scores/"+partitura);
        console.log("\nCargando:\n"+txt);
        comdasuar.nuevaPartituraAMS(txt);
    }

    comdasuar.transportarSeq(100);
    console.log(" \n ~ transportarSeq "+comdasuar.editSeq().print());

    comdasuar.invertirSeq(7200);
    console.log(" \n ~ invertirSeq "+comdasuar.editSeq().print());

    comdasuar.retrogradarAlturasSeq();
    console.log(" \n ~ retrogradarAlturasSeq "+comdasuar.editSeq().print());

    comdasuar.retrogradarDuracionesSeq();
    console.log(" \n ~ retrogradarDuracionesSeq "+comdasuar.editSeq().print());

    comdasuar.transmutarAlturasBankSeq(  0 , 14  );
    console.log(" \n ~ transmutarAlturasSeq "+comdasuar.editSeq().print());

    comdasuar.transmutarDuracionesBankSeq( 0 , 12 );
    console.log(" \n ~ retrogradarDuracionesSeq "+comdasuar.editSeq().print());
}


function desplegarBanco(){
    ADMIN.bancos[0].print();
}

function exportarJSON(r){
    let local = process.cwd()+"/";
    Persistencia.guardarAdmin(ADMIN, local+r+".json");
}

function importarJSON(r){
    let local = process.cwd()+"/";
    console.log("intentando cargar "+local);
    Persistencia.cargarAdmin(ADMIN, local+r);
}

testParser()

module.exports = {testParser,tester2, cargarArchivo,desplegarBanco,exportarJSON,importarJSON,ADMIN,comdasuar};
