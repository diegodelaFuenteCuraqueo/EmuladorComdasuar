const {test} = require('node:test');
const assert = require('node:assert');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const {MIDIexport} = require('../../src/MIDIexport.js');

// ------- pequeño lector de SMF solo para verificar la salida -------
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
    assert.deepStrictEqual(b.slice(0, 4), [0x4D, 0x54, 0x68, 0x64]); // MThd
    assert.strictEqual(b[4] << 24 | b[5] << 16 | b[6] << 8 | b[7], 6); // longitud cabecera
    const format = (b[8] << 8) | b[9];
    const ntrks = (b[10] << 8) | b[11];
    const division = (b[12] << 8) | b[13];

    const tracks = [];
    let pos = 14;
    for (let t = 0; t < ntrks; t++){
        assert.deepStrictEqual(b.slice(pos, pos + 4), [0x4D, 0x54, 0x72, 0x6B]); // MTrk
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
    assert.strictEqual(pos, b.length, 'los chunks cubren todo el archivo');
    return {format, ntrks, division, tracks};
}

function seqDeAMS(ams){
    return BancoDeSecuencias.secuenciaDesdeAMS(ams);
}

test('cabecera: formato 1, PPQ 480, una pista por secuencia + conductor', () => {
    const midi = MIDIexport.bancos2mid([seqDeAMS('4C N'), seqDeAMS('4E N')]);
    const smf = parsearSMF(midi);
    assert.strictEqual(smf.format, 1);
    assert.strictEqual(smf.division, 480);
    assert.strictEqual(smf.ntrks, 3);
});

test('pista 0: tempo por defecto = 1.000.000 us por negra (60 bpm)', () => {
    const smf = parsearSMF(MIDIexport.bancos2mid([seqDeAMS('4C N')]));
    const conductor = smf.tracks[0];
    const tempo = conductor.events.find(e => e.meta === 0x51);
    assert.deepStrictEqual(tempo.datos, [0x0F, 0x42, 0x40]);
    const fin = conductor.events.find(e => e.meta === 0x2F);
    assert.ok(fin);
});

test('una negra 4C dura 480 ticks (on en 0, off en 480)', () => {
    const smf = parsearSMF(MIDIexport.bancos2mid([seqDeAMS('4C N')]));
    const notas = smf.tracks[1].events.filter(e => e.status === 0x90 || e.status === 0x80);
    assert.deepStrictEqual(notas[0], {tick: 0, status: 0x90, d1: 0x3C, d2: 0x50});
    assert.deepStrictEqual(notas[1], {tick: 480, status: 0x80, d1: 0x3C, d2: 0x00});
});

test('una blanca 4C B dura 960 ticks (VLQ 0x87 0x40)', () => {
    const smf = parsearSMF(MIDIexport.bancos2mid([seqDeAMS('4C B')]));
    const notas = smf.tracks[1].events.filter(e => e.status === 0x90 || e.status === 0x80);
    assert.strictEqual(notas[0].tick, 0);
    assert.strictEqual(notas[1].tick, 960);
});

test('los silencios generan pausas: la nota suena a partir del tick 480', () => {
    const smf = parsearSMF(MIDIexport.bancos2mid([seqDeAMS('R N 4C N')]));
    const notas = smf.tracks[1].events.filter(e => e.status === 0x90 || e.status === 0x80);
    assert.strictEqual(notas.length, 2);
    assert.strictEqual(notas[0].tick, 480); // on tras el silencio
    assert.strictEqual(notas[0].d1, 0x3C);
});

test('N=120 genera tempo meta de 500.000 us por negra', () => {
    const smf = parsearSMF(MIDIexport.bancos2mid([seqDeAMS('N=120 4C N')]));
    const tempo = smf.tracks[0].events.find(e => e.meta === 0x51);
    assert.deepStrictEqual(tempo.datos, [0x07, 0xA1, 0x20]);
});

test('los cuartos de tono se redondean al semitono más cercano', () => {
    const smf = parsearSMF(MIDIexport.bancos2mid([seqDeAMS('4CU N')]));
    const on = smf.tracks[1].events.find(e => e.status === 0x90);
    assert.strictEqual(on.d1, 0x3D); // 6050 mc -> 61
});

test('MIDIexport.quarterMs devuelve ms por negra según el tempo', () => {
    const dict = MIDIexport.quarterMs({figura: 'N', pulsosPorMin: 60, duracionPulso: 1000});
    assert.strictEqual(dict, 1000);
    const rapido = MIDIexport.quarterMs({figura: 'N', pulsosPorMin: 120, duracionPulso: 500});
    assert.strictEqual(rapido, 500);
});

test('bancos2mid con banco vacío lanza error', () => {
    assert.throws(() => MIDIexport.bancos2mid([]), /no contiene secuencias/);
});

test('secuencia2mid produce 2 pistas (conductor + secuencia)', () => {
    const smf = parsearSMF(MIDIexport.secuencia2mid(seqDeAMS('4C N')));
    assert.strictEqual(smf.ntrks, 2);
});

test('la salida es un Uint8Array', () => {
    const midi = MIDIexport.bancos2mid([seqDeAMS('4C N')]);
    assert.ok(midi instanceof Uint8Array);
});
