/* Provenance de secuencias: registro de transformaciones heurísticas y
 * restauración del original a partir del código AMS. */
const {test} = require('node:test');
const assert = require('node:assert');
const {SecuenciaAsuar} = require('../../src/SecuenciaAsuar.js');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const {EmuladorComdasuar} = require('../../src/EmuladorComdasuar.js');
const Heuristicos = require('../../src/Heuristicos.js');

EmuladorComdasuar.setDebug(false);

test('los procesos heurísticos registran la transformación aplicada', () => {
    const seq = SecuenciaAsuar.desdeAMS('j1 n 4c 4d 4e');
    assert.strictEqual(seq.estaTransformada(), false);

    Heuristicos.transportar(seq, 200);
    Heuristicos.invertir(seq, 7200);
    Heuristicos.retrogradarAlturas(seq);
    Heuristicos.retrogradarDuraciones(seq);
    Heuristicos.expandirAlturas(seq, 7200, 2);
    Heuristicos.expandirDuraciones(seq, 1.5);
    Heuristicos.desordenarAlturas(seq);
    Heuristicos.desordenarDuraciones(seq);

    const ops = seq.getTransformaciones().map(t => t.op);
    assert.deepStrictEqual(ops, [
        'transportar', 'invertir', 'retrogradarAlturas', 'retrogradarDuraciones',
        'expandirAlturas', 'expandirDuraciones', 'desordenarAlturas', 'desordenarDuraciones'
    ]);
    assert.strictEqual(seq.estaTransformada(), true);
    assert.strictEqual(seq.getTransformaciones()[0].params[0], 200);
});

test('las transmutaciones registran la transformación en el banco A', () => {
    const seqA = SecuenciaAsuar.desdeAMS('j1 n 4c 4d');
    const seqB = SecuenciaAsuar.desdeAMS('j1 n 5e 5f');
    Heuristicos.transmutarAlturas(seqA, seqB);
    Heuristicos.transmutarDuraciones(seqA, seqB);
    assert.deepStrictEqual(seqA.getTransformaciones().map(t => t.op),
        ['transmutarAlturas', 'transmutarDuraciones']);
    assert.strictEqual(seqB.estaTransformada(), false);
});

test('restaurarOriginal revierte notas, tempo y compás y borra el historial', () => {
    const seq = SecuenciaAsuar.desdeAMS('N=120 [3+2/8] j1 n 4c 4d 4e');
    const notasOriginales = JSON.stringify(seq.getNotas());
    const tempoOriginal = seq.getTempo().pulsosPorMin;

    Heuristicos.transportar(seq, 200);
    Heuristicos.retrogradarAlturas(seq);
    assert.notDeepStrictEqual(JSON.stringify(seq.getNotas()), notasOriginales);

    assert.strictEqual(seq.restaurarOriginal(), true);
    assert.deepStrictEqual(JSON.stringify(seq.getNotas()), notasOriginales);
    assert.strictEqual(seq.getTempo().pulsosPorMin, tempoOriginal);
    assert.strictEqual(seq.getCompas().texto, '[3+2/8]');
    assert.strictEqual(seq.estaTransformada(), false);
});

test('restaurarOriginal conserva el nombre y el índice de la secuencia', () => {
    const seq = SecuenciaAsuar.desdeAMS('j1 n 4c');
    seq.setNombre('Mi Melodía');
    seq.setIndex(3);
    Heuristicos.transportar(seq, 100);
    seq.restaurarOriginal();
    assert.strictEqual(seq.getNombre(), 'Mi Melodía');
    assert.strictEqual(seq.getIndice(), 3);
});

test('restaurarOriginal devuelve false si no hay código AMS', () => {
    const seq = new SecuenciaAsuar();
    assert.strictEqual(seq.restaurarOriginal(), false);
});

test('el historial sobrevive al round-trip JSON (cargarSecuencia)', () => {
    const seq = SecuenciaAsuar.desdeAMS('j1 n 4c 4d');
    Heuristicos.transportar(seq, 200);
    const copia = new SecuenciaAsuar();
    copia.cargarSecuencia(JSON.parse(JSON.stringify(seq)));
    assert.deepStrictEqual(copia.getTransformaciones(), seq.getTransformaciones());
    assert.strictEqual(copia.estaTransformada(), true);
});

test('el historial sobrevive al round-trip del banco (cargarBanco)', () => {
    const em = new EmuladorComdasuar();
    em.nuevaPartituraAMS('j1 n 4c 4d');
    const seq = em.editSeq();
    Heuristicos.transportar(seq, 200);

    const json = em.ADMIN.exportarJSON();
    const em2 = new EmuladorComdasuar(json);
    assert.strictEqual(em2.getBancoSecuencia(0, 0).estaTransformada(), true);
    assert.strictEqual(em2.getBancoSecuencia(0, 0).getTransformaciones()[0].op, 'transportar');
});

test('EmuladorComdasuar.restaurarSeq restaura la secuencia seleccionada', () => {
    const em = new EmuladorComdasuar();
    em.nuevaPartituraAMS('j1 n 4c 4d 4e');
    const antes = JSON.stringify(em.editSeq().getNotas());
    em.transportarSeq(200);   // llama a Heuristicos (registra la transformación)
    assert.strictEqual(em.editSeq().estaTransformada(), true);
    em.restaurarSeq();
    assert.strictEqual(em.editSeq().estaTransformada(), false);
    assert.deepStrictEqual(JSON.stringify(em.editSeq().getNotas()), antes);
});
