const {test} = require('node:test');
const assert = require('node:assert');
const {EmuladorComdasuar} = require('../../src/EmuladorComdasuar.js');

EmuladorComdasuar.setDebug(false);

function emuladorConBancos(){
    const em = new EmuladorComdasuar();
    em.nuevaPartituraAMS('4C N 4E S');
    em.nuevaPartituraAMS('5A B');
    return em;
}

test('cargarJSON con arreglo recompila bancos y grupos (round-trip)', () => {
    const em = emuladorConBancos();
    em.editBanco().nuevoGrupo();
    em.nuevaPartituraAMS('3C N');
    const json = em.ADMIN.exportarJSON();

    const em2 = new EmuladorComdasuar(json);
    assert.strictEqual(em2.ADMIN.bancos.length, 1);
    assert.strictEqual(em2.editBanco().getSizeGrupos(), 2);
    assert.deepStrictEqual(em2.getBancoSecuencia(0, 0).getMidicents(), [6000, 6400]);
    const seqDelGrupo2 = em2.getBancoSecuenciaG(0, 1, 0);
    assert.ok(seqDelGrupo2);
    assert.deepStrictEqual(seqDelGrupo2.getMidicents(), [4800]);
});

test('cargarJSON acepta un objeto de banco suelto y lo envuelve en arreglo', () => {
    const em = emuladorConBancos();
    const bancoSuelto = JSON.parse(em.ADMIN.exportarJSON())[0];

    const em2 = new EmuladorComdasuar();
    em2.ADMIN.cargarJSON(JSON.stringify(bancoSuelto));

    assert.strictEqual(em2.ADMIN.bancos.length, 1);
    assert.strictEqual(em2.editBanco().getNombre(), bancoSuelto.nombre);
    assert.strictEqual(em2.editBanco().getSizeGrupos(), 1);
    assert.strictEqual(em2.getBancoSecuencia(0, 0).getNombre(), 'seq_1');
});

test('cargarJSON acepta un banco suelto con formato legacy {secuencias}', () => {
    const em = emuladorConBancos();
    const bancoSuelto = JSON.parse(em.ADMIN.exportarJSON())[0];
    const legacy = {nombre: bancoSuelto.nombre, secuencias: bancoSuelto.grupos[0].secuencias};

    const em2 = new EmuladorComdasuar();
    em2.ADMIN.cargarJSON(JSON.stringify(legacy));

    assert.strictEqual(em2.ADMIN.bancos.length, 1);
    assert.strictEqual(em2.editBanco().getSizeGrupos(), 1);
    assert.strictEqual(em2.editBanco().getGrupos()[0].nombre, 'grupo_A');
    assert.strictEqual(em2.getBancoSecuencia(0, 0).getNombre(), 'seq_1');
    assert.deepStrictEqual(em2.getBancoSecuencia(0, 1).getMidicents(), [8100]);
});

test('compilarJSON desenvuelve JSON doble-codificado (string literal)', () => {
    const em = emuladorConBancos();
    const dobleCodificado = JSON.stringify(em.ADMIN.exportarJSON());

    const em2 = new EmuladorComdasuar();
    em2.ADMIN.cargarJSON(dobleCodificado);

    assert.strictEqual(em2.ADMIN.bancos.length, 1);
    assert.strictEqual(em2.editBanco().getSizeGrupos(), 1);
    assert.deepStrictEqual(em2.getBancoSecuencia(0, 0).getMidicents(), [6000, 6400]);
    assert.deepStrictEqual(em2.getBancoSecuencia(0, 1).getMidicents(), [8100]);
});

test('compilarJSON reinicia la seleccion de banco a 0', () => {
    const em = emuladorConBancos();
    em.nuevoBanco();
    assert.strictEqual(em.ADMIN.getBancoActualIndex(), 1);
    em.ADMIN.cargarJSON(em.ADMIN.exportarJSON());

    assert.strictEqual(em.ADMIN.getBancoActualIndex(), 0);
    assert.ok(em.editBanco());
});
