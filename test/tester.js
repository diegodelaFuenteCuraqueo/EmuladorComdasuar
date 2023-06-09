const {AMSparser} = require('../src/AMSparser.js');
const {DiccionarioAsuar} = require('../src/diccionarioAsuar.js');
const {SecuenciaAsuar} = require("../src/SecuenciaAsuar.js");
const {BancoDeSecuencias} = require("../src/BancoDeSecuencias.js");
const {AdministradorDeBancos} = require("../src/AdministradorDeBancos.js");
const {NotaAsuar} = require('../src/NotaAsuar.js');
const {EmuladorComdasuar} = require("../src/EmuladorComdasuar.js");

const fs  = require('fs');

let COMPILADOR;
let AMS ;
let BANCO;

let ADMIN = new AdministradorDeBancos();

COMPILADOR = new DiccionarioAsuar();
ADMIN.addBanco(new BancoDeSecuencias());

function cargarArchivo(file){
    var texto = "";
    var str = fs.readFileSync(file, 'utf8');
    // This will block the event loop, not recommended for non-cli programs.
    //console.log(str);
    return str;
}

function testParser(){

    let partituras= fs.readdirSync("./test/scores");;
    console.log(partituras.length+" archivos txt cargados.\n")

    for(let partitura of partituras){

        AMS = new AMSparser();

        let seq = new SecuenciaAsuar(partitura);

        //cargamos txt en el parser y en el ams
        console.log("\nCargando "+partitura+"- - - - - - - - - - - - - - - -");
        let txt = cargarArchivo("./test/scores/"+partitura);
        console.log(txt);

        AMS.cargarPartitura(txt);
        seq.setCodigoAMS(AMS.stringIn);

        //compilamos y asignamos tempo
        console.log("\nCOMPILANDO- - - - - - - - - - - - - - - - - - - - - - - -")
        AMS.compilar();

        console.log("\nLista de palabras: "+AMS.listaDePalabras.length)
        console.log(AMS.listaDePalabras.join(" ") +"\n");

        seq.setTempo(AMS.getTempo());

        //ingresamos nota a nota
        out = [];
        for(let x = 0; x <AMS.AMSduraciones.length; x++){

            seq.addNota(new NotaAsuar(AMS.codigoPlano.alturas[x], AMS.codigoPlano.duraciones[x]));
            let n = seq.getUltimaNota();

            out.push({
                " nota ": AMS.AMSalturas[x],
                "   dur. ":AMS.AMSduraciones[x],
                " nota (r) ": AMS.codigoPlano.alturas[x],
                "   dur (r) ":AMS.codigoPlano.duraciones[x],
                " MIDICENT": COMPILADOR.alt2mc(AMS.codigoPlano.alturas[x]),
                " DUR (MS.)": COMPILADOR.dur2ms(AMS.codigoPlano.duraciones[x])
            });

        }

        ADMIN.bancos[0].addSeq(seq);

        //imprime tabla con notas e info de seqs
        console.table(out);
        seq.aplicarTempo();
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

    //console.log("test get banco secuenca ",comdasuar.getBancoSecuencia( 0 , 14 ).getMidicents() );
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
    ADMIN.exportarJSON(local+r+".json");
}

function importarJSON(r){
    let local = process.cwd()+"/";
    console.log("intentando cargar "+local);
    ADMIN.importarJSON(local+r);
    ADMIN.compilarJSON();
}

testParser()

module.exports = {testParser,tester2, cargarArchivo,desplegarBanco,exportarJSON,importarJSON,ADMIN,comdasuar};
