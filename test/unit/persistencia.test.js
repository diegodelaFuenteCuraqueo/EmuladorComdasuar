const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {EmuladorComdasuar} = require('../../src/EmuladorComdasuar.js');
const Persistencia = require('../../src/Persistencia.js');
const {MIDIexport} = require('../../src/MIDIexport.js');

EmuladorComdasuar.setDebug(false);

function emuladorDePrueba(){
    const em = new EmuladorComdasuar();
    em.nuevaPartituraAMS('4C N 4E S');
    em.nuevaPartituraAMS('5A B');
    return em;
}

test('exportarJSON/constructor hacen un round-trip fiel (tempo por defecto)', () => {
    const json = emuladorDePrueba().ADMIN.exportarJSON();
    const em = new EmuladorComdasuar(json);

    assert.strictEqual(em.ADMIN.bancos.length, 1);
    const banco = em.getBancoSecuencia;
    assert.ok(banco);

    const seq0 = em.getBancoSecuencia(0, 0);
    assert.deepStrictEqual(seq0.getMidicents(), [6000, 6400]);
    assert.deepStrictEqual(seq0.getDuraciones(), [1000, 250]);
    assert.deepStrictEqual(seq0.getInicios(), [0, 1000]);

    const seq1 = em.getBancoSecuencia(0, 1);
    assert.deepStrictEqual(seq1.getMidicents(), [8100]);
    assert.deepStrictEqual(seq1.getDuraciones(), [2000]);
});

test('el round-trip respeta los cambios de tempo (N=120)', () => {
    const em = new EmuladorComdasuar();
    em.nuevaPartituraAMS('N=120 4C N 4E N');
    const json = em.ADMIN.exportarJSON();

    const em2 = new EmuladorComdasuar(json);
    const seq = em2.getBancoSecuencia(0, 0);
    assert.deepStrictEqual(seq.getDuraciones(), [500, 500]);
    assert.strictEqual(seq.getTempo().pulsosPorMin, 120);
    assert.strictEqual(seq.getTempo().duracionPulso, 500);
});

test('el round-trip conserva los nombres de secuencia', () => {
    const em = new EmuladorComdasuar();
    em.nuevaPartituraAMS('4C N');
    em.editSeq().setNombre('melodia de prueba');
    const json = em.ADMIN.exportarJSON();

    const em2 = new EmuladorComdasuar(json);
    assert.strictEqual(em2.getBancoSecuencia(0, 0).getNombre(), 'melodia de prueba');
});

test('guardarAdmin + cargarAdmin (disco) preservan los bancos', () => {
    const em = emuladorDePrueba();
    const ruta = path.join(os.tmpdir(), `comdasuar-test-${Date.now()}.json`);
    Persistencia.guardarAdmin(em.ADMIN, ruta);

    const em2 = new EmuladorComdasuar();
    Persistencia.cargarAdmin(em2.ADMIN, ruta);
    fs.unlinkSync(ruta);

    assert.deepStrictEqual(em2.getBancoSecuencia(0, 0).getMidicents(), [6000, 6400]);
    assert.deepStrictEqual(em2.getBancoSecuencia(0, 1).getMidicents(), [8100]);
});

test('guardarMIDI escribe los bytes en disco', () => {
    const em = emuladorDePrueba();
    const bytes = MIDIexport.bancos2mid(em.editBanco());
    const ruta = path.join(os.tmpdir(), `comdasuar-test-${Date.now()}.mid`);
    Persistencia.guardarMIDI(bytes, ruta);

    const leidos = fs.readFileSync(ruta);
    fs.unlinkSync(ruta);

    assert.deepStrictEqual(leidos, Buffer.from(bytes));
    assert.strictEqual(leidos.length, bytes.length);
});
