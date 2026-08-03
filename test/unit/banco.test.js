const {test} = require('node:test');
const assert = require('node:assert');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const {SecuenciaAsuar} = require('../../src/SecuenciaAsuar.js');

function seqDeAMS(ams){
    return BancoDeSecuencias.secuenciaDesdeAMS(ams);
}

test('secuenciaDesdeAMS (static) es el pipeline único de parseo', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('4C N 4E S');
    assert.ok(seq instanceof SecuenciaAsuar);
    assert.strictEqual(seq.getNotas().length, 2);
});

test('addSeq asigna índices y selecciona la última', () => {
    const banco = new BancoDeSecuencias('mi banco');
    banco.addSeq(seqDeAMS('4C N'));
    banco.addSeq(seqDeAMS('4E N'));

    assert.strictEqual(banco.getSize(), 2);
    assert.strictEqual(banco.getSeq(0).getIndice(), 0);
    assert.strictEqual(banco.getSeq(1).getIndice(), 1);
    assert.strictEqual(banco.getSecuenciaActualIndex(), 1);
});

test('addSeqAMS compila la partitura y la agrega', () => {
    const banco = new BancoDeSecuencias();
    banco.addSeqAMS('4C N 4E S');
    assert.strictEqual(banco.getSize(), 1);
    assert.strictEqual(banco.getSeq(0).getNotas().length, 2);
});

test('selSeq selecciona una secuencia existente', () => {
    const banco = new BancoDeSecuencias();
    banco.addSeq(seqDeAMS('4C N'));
    banco.addSeq(seqDeAMS('4E N'));
    banco.selSeq(0);
    assert.strictEqual(banco.getSecuenciaActualIndex(), 0);
});

test('setSeq reemplaza una secuencia y la selecciona', () => {
    const banco = new BancoDeSecuencias();
    banco.addSeq(seqDeAMS('4C N'));
    const nueva = seqDeAMS('5A B');
    banco.setSeq(0, nueva);
    assert.strictEqual(banco.getSeq(0).getMidicents()[0], 8100);
    assert.strictEqual(banco.getSecuenciaActualIndex(), 0);
});

test('los nombres de secuencias vacíos reciben uno por defecto', () => {
    const banco = new BancoDeSecuencias();
    banco.addSeqAMS('4C N');
    assert.notStrictEqual(banco.getSeq(0).getNombre(), '');
    assert.ok(banco.getSeq(0).getNombre().length > 0);
});
