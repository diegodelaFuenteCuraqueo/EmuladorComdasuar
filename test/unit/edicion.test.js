const {test} = require('node:test');
const assert = require('node:assert');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const {AdministradorDeBancos} = require('../../src/AdministradorDeBancos.js');
const {EmuladorComdasuar} = require('../../src/EmuladorComdasuar.js');
const {SecuenciaAsuar} = require('../../src/SecuenciaAsuar.js');

test('clone() crea una copia profunda e independiente', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('j1 n 4c 4d 4e');
    seq.setNombre('Original');
    const copia = seq.clone();

    assert.strictEqual(copia.getNombre(), 'Original');
    assert.deepStrictEqual(copia.getMidicents(), seq.getMidicents());
    assert.deepStrictEqual(copia.getDuraciones(), seq.getDuraciones());
    assert.notStrictEqual(copia, seq);
    assert.notStrictEqual(copia.getNotas()[0], seq.getNotas()[0]);

    copia.setMidicents([7000, 7000, 7000]);
    assert.notDeepStrictEqual(copia.getMidicents(), seq.getMidicents());
});

test('deleteSeq() elimina, reindexa y ajusta la secuencia actual', () => {
    const banco = new BancoDeSecuencias('T');
    banco.addSeqAMS('j1 n 4c'); // 0
    banco.addSeqAMS('j1 n 4d'); // 1
    banco.addSeqAMS('j1 n 4e'); // 2
    banco.selSeq(2);

    assert.strictEqual(banco.deleteSeq(1), true);
    assert.strictEqual(banco.getSize(), 2);
    assert.strictEqual(banco.getSeq(0).getIndice(), 0);
    assert.strictEqual(banco.getSeq(1).getIndice(), 1);
    // al eliminar la seleccionada, cae a la última válida
    assert.strictEqual(banco.getSecuenciaActualIndex(), 1);

    assert.strictEqual(banco.deleteSeq(9), false);
    assert.strictEqual(banco.deleteSeq(-1), false);
});

test('deleteSeq() de la última secuencia deja un banco vacío sin romper', () => {
    const banco = new BancoDeSecuencias('T');
    banco.addSeqAMS('j1 n 4c');
    banco.deleteSeq(0);
    assert.strictEqual(banco.getSize(), 0);
    assert.strictEqual(banco.getSecuenciaActualIndex(), 0);
});

test('duplicarSeq() agrega una copia al final del banco', () => {
    const banco = new BancoDeSecuencias('T');
    banco.addSeqAMS('j1 n 4c 4d');
    banco.selSeq(0);
    const copia = banco.duplicarSeq(0);

    assert.ok(copia);
    assert.strictEqual(banco.getSize(), 2);
    assert.strictEqual(banco.getSecuenciaActualIndex(), 1);
    assert.strictEqual(copia.getNombre(), 'seq_1_copia');
    assert.deepStrictEqual(copia.getMidicents(), banco.getSeq(0).getMidicents());

    assert.strictEqual(banco.duplicarSeq(99), null);
});

test('deleteBanco() elimina, reindexa y crea un banco vacío si no queda ninguno', () => {
    const admin = new AdministradorDeBancos();
    admin.addBanco(new BancoDeSecuencias('A'));
    admin.addBanco(new BancoDeSecuencias('B'));
    admin.addBanco(new BancoDeSecuencias('C'));
    admin.selBanco(2);

    assert.strictEqual(admin.deleteBanco(1), true);
    assert.strictEqual(admin.bancos.length, 2);
    assert.strictEqual(admin.bancos[0].getIndice(), 0);
    assert.strictEqual(admin.bancos[1].getIndice(), 1);
    assert.strictEqual(admin.getBancoActualIndex(), 1);

    admin.deleteBanco(1);
    admin.deleteBanco(0);
    assert.strictEqual(admin.bancos.length, 1, 'queda un banco vacío de respaldo');
    assert.strictEqual(admin.bancos[0].getIndice(), 0);
    assert.ok(admin.editBanco() instanceof BancoDeSecuencias);
});

test('métodos de la fachada: eliminarSeq/duplicarSeq/eliminarBanco', () => {
    const comdasuar = new EmuladorComdasuar();
    comdasuar.nuevaPartituraAMS('j1 n 4c');
    comdasuar.nuevaPartituraAMS('j1 n 4d');
    comdasuar.selSeq(0);

    const copia = comdasuar.duplicarSeq();
    assert.ok(copia);
    assert.strictEqual(comdasuar.editBanco().getSize(), 3);

    comdasuar.selSeq(0);
    assert.strictEqual(comdasuar.eliminarSeq(), true);
    assert.strictEqual(comdasuar.editBanco().getSize(), 2);

    assert.strictEqual(comdasuar.eliminarBanco(), true);
    assert.strictEqual(comdasuar.ADMIN.bancos.length, 1, 'respaldo vacío tras borrar todo');
});
