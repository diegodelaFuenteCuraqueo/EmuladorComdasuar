/* Banco como paleta de grupos (columnas) × secuencias: nombres por defecto,
 * creación/eliminación de grupos, API por coordenadas, JSON y exportación MIDI/ZIP. */
const {test} = require('node:test');
const assert = require('node:assert');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const {MIDIexport} = require('../../src/MIDIexport.js');

// ------- pequeño lector de SMF (reutilizado de midi.test.js) -------
function leerVLQ(b, pos){
    let valor = 0;
    while (true){
        const byte = b[pos++];
        valor = (valor << 7) | (byte & 0x7F);
        if (!(byte & 0x80)) break;
    }
    return {valor, pos};
}
function parsearSMF(midi){
    const b = Array.from(midi);
    const ntrks = (b[10] << 8) | b[11];
    const tracks = [];
    let pos = 14;
    for (let t = 0; t < ntrks; t++){
        const len = ((b[pos+4] << 24) | (b[pos+5] << 16) | (b[pos+6] << 8) | b[pos+7]) >>> 0;
        const fin = pos + 8 + len;
        const events = [];
        let p = pos + 8;
        let tick = 0;
        while (p < fin){
            const vlq = leerVLQ(b, p);
            tick += vlq.valor;
            p = vlq.pos;
            const status = b[p];
            if (status === 0xFF){
                const tipo = b[p + 1];
                const lenEv = leerVLQ(b, p + 2);
                const datos = b.slice(lenEv.pos, lenEv.pos + lenEv.valor);
                events.push({tick, meta: tipo, datos});
                p = lenEv.pos + lenEv.valor;
            } else {
                events.push({tick, status, d1: b[p + 1], d2: b[p + 2]});
                p += 3;
            }
        }
        tracks.push({events, fin});
        pos = fin;
    }
    return {ntrks, tracks};
}

test('un banco nuevo no tiene grupos; el primer addSeq crea grupo_A', () => {
    const b = new BancoDeSecuencias('Test');
    assert.strictEqual(b.getSizeGrupos(), 0);
    b.addSeqAMS('j1 n 4c 4d');
    assert.strictEqual(b.getSizeGrupos(), 1);
    assert.strictEqual(b.getGrupos()[0].nombre, 'grupo_A');
});

test('las secuencias se nombran seq_N por grupo (base 1)', () => {
    const b = new BancoDeSecuencias('Test');
    b.addSeqAMS('j1 n 4c');
    b.addSeqAMS('j1 n 4d');
    assert.strictEqual(b.getSeq(0).getNombre(), 'seq_1');
    assert.strictEqual(b.getSeq(1).getNombre(), 'seq_2');
    b.nuevoGrupo();
    b.addSeqAMS('j1 n 4e');
    assert.strictEqual(b.getSeq(0).getNombre(), 'seq_1'); // la numeración se reinicia por grupo
});

test('nuevoGrupo agrega la próxima letra y lo selecciona', () => {
    const b = new BancoDeSecuencias('Test');
    b.addSeqAMS('j1 n 4c');
    assert.strictEqual(b.nuevoGrupo(), 1);
    assert.strictEqual(b.getGrupos().length, 2);
    assert.strictEqual(b.getGrupos()[1].nombre, 'grupo_B');
    assert.strictEqual(b.getGrupoActualIndex(), 1);
});

test('selGrupo/setGrupoNombre/getGrupos', () => {
    const b = new BancoDeSecuencias('Test');
    b.addSeqAMS('j1 n 4c');
    b.nuevoGrupo();
    b.setGrupoNombre(1, 'Cuerdas');
    assert.strictEqual(b.getGrupos()[1].nombre, 'Cuerdas');
    b.selGrupo(0);
    assert.strictEqual(b.getGrupoActualIndex(), 0);
});

test('deleteGrupo elimina el grupo y reajusta el seleccionado', () => {
    const b = new BancoDeSecuencias('Test');
    b.addSeqAMS('j1 n 4c');
    b.nuevoGrupo();
    assert.strictEqual(b.deleteGrupo(1), true);
    assert.strictEqual(b.getSizeGrupos(), 1);
    assert.strictEqual(b.deleteGrupo(0), true);
    assert.strictEqual(b.getSizeGrupos(), 0);
    assert.strictEqual(b.deleteGrupo(5), false);
});

test('API por coordenadas: getSeqG, addSeqGrupoAMS, selSeqGrupo, editSeqGrupo, flatten', () => {
    const b = new BancoDeSecuencias('Test');
    b.addSeqAMS('j1 n 4c');
    b.nuevoGrupo();
    b.addSeqGrupoAMS(1, 'j1 n 4e');
    assert.strictEqual(b.getSeqG(0, 0).getNombre(), 'seq_1');
    assert.strictEqual(b.getSeqG(1, 0).getNombre(), 'seq_1');
    assert.strictEqual(b.getSeqG(0, 5), undefined);

    b.selSeqGrupo(1, 0);
    assert.strictEqual(b.getGrupoActualIndex(), 1);
    assert.strictEqual(b.getSecuenciaActualIndex(), 0);
    assert.strictEqual(b.editSeqGrupo(0, 0), b.getSeqG(0, 0));

    assert.strictEqual(b.flatten().length, 2);
});

test('addSeqAMS con un grupo inexistente no hace nada', () => {
    const b = new BancoDeSecuencias('Test');
    assert.strictEqual(b.addSeqGrupoAMS(3, 'j1 n 4c'), null);
    assert.strictEqual(b.getSize(), 0);
});

function seqJSON(ams, nombre){
    const s = BancoDeSecuencias.secuenciaDesdeAMS(ams);
    if (nombre) s.setNombre(nombre);
    return JSON.parse(JSON.stringify(s));
}

test('cargarBanco acepta el formato {grupos} y reindexa los nombres por defecto', () => {
    const b = new BancoDeSecuencias('Test');
    b.cargarBanco({
        nombre: 'Nuevo',
        grupos: [
            {nombre: 'Vientos', secuencias: [seqJSON('j1 n 4c', 'Clarinete'), seqJSON('j1 n 4d')]},
            {nombre: 'grupo_B', secuencias: []}
        ]
    });
    assert.strictEqual(b.getSizeGrupos(), 2);
    assert.strictEqual(b.getGrupos()[0].nombre, 'Vientos');
    assert.strictEqual(b.getSeqG(0, 0).getNombre(), 'Clarinete');
    assert.strictEqual(b.getSeqG(0, 1).getNombre(), 'seq_2');
});

test('cargarBanco acepta el formato legacy {secuencias} y lo envuelve en grupo_A', () => {
    const b = new BancoDeSecuencias('Test');
    b.cargarBanco({nombre: 'Viejo', secuencias: [seqJSON('j1 n 4c', 'seq_1'), seqJSON('j1 n 4d', 'Melodía')]});
    assert.strictEqual(b.getSizeGrupos(), 1);
    assert.strictEqual(b.getGrupos()[0].nombre, 'grupo_A');
    assert.strictEqual(b.getSize(), 2);
    assert.strictEqual(b.getSeqG(0, 1).getNombre(), 'Melodía');
});

test('bancos2zip genera un .mid por secuencia con etiqueta <seq> - <grupo>', () => {
    const b = new BancoDeSecuencias('Test');
    b.addSeqAMS('j1 n 4c');
    b.nuevoGrupo();
    b.addSeqAMS('j1 n 4d');
    b.getSeq(0).setNombre('Adagio');
    b.setGrupoNombre(1, 'Cuerdas');

    const zip = MIDIexport.bancos2zip(b);
    assert.ok(zip instanceof Uint8Array);
    assert.ok(zip.length > 0);
});

test('secuenciasConGrupo recorre los grupos en orden con su nombre', () => {
    const b = new BancoDeSecuencias('Test');
    b.addSeqAMS('j1 n 4c');
    b.nuevoGrupo();
    b.addSeqAMS('j1 n 4d');
    const pares = MIDIexport.secuenciasConGrupo(b);
    assert.deepStrictEqual(pares.map(p => [p.seq.getNombre(), p.grupo]),
        [['seq_1', 'grupo_A'], ['seq_1', 'grupo_B']]);
});

test('cada pista de secuencia emite su propio tempo meta (FF 51 03) en el tick 0', () => {
    const b = new BancoDeSecuencias('Test');
    b.addSeqAMS('j1 n 4c');
    b.nuevoGrupo();
    b.addSeqAMS('N=120 j1 n 4d');

    const smf = parsearSMF(MIDIexport.bancos2mid(b));
    assert.strictEqual(smf.ntrks, 3);
    // pista de cada secuencia: primer evento es tempo
    assert.strictEqual(smf.tracks[1].events[0].meta, 0x51);
    assert.deepStrictEqual(smf.tracks[1].events[0].datos, [0x0F, 0x42, 0x40]); // 60 bpm
    assert.strictEqual(smf.tracks[2].events[0].meta, 0x51);
    assert.deepStrictEqual(smf.tracks[2].events[0].datos, [0x07, 0xA1, 0x20]); // 120 bpm
});

test('bancos2mid con banco de grupos aplanado a las secuencias', () => {
    const b = new BancoDeSecuencias('Test');
    b.addSeqAMS('j1 n 4c');
    b.nuevoGrupo();
    b.addSeqAMS('j1 n 4d');
    const smf = parsearSMF(MIDIexport.bancos2mid(b));
    assert.strictEqual(smf.ntrks, 3); // conductor + 2 secuencias
});
