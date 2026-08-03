const {test} = require('node:test');
const assert = require('node:assert');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const Heuristicos = require('../../src/Heuristicos.js');

function seqDeAMS(ams){
    return BancoDeSecuencias.secuenciaDesdeAMS(ams);
}

test('transportar desplaza todos los midicents', () => {
    const seq = seqDeAMS('4C N 4E N');
    Heuristicos.transportar(seq, 100);
    assert.deepStrictEqual(seq.getMidicents(), [6100, 6500]);
});

test('invertir refleja las alturas en torno al eje', () => {
    const seq = seqDeAMS('4C N 4E N');
    Heuristicos.invertir(seq, 7200);
    assert.deepStrictEqual(seq.getMidicents(), [8400, 8000]);
});

test('retrogradarAlturas invierte el orden de las alturas sin tocar duraciones', () => {
    const seq = seqDeAMS('4C N 4E S');
    Heuristicos.retrogradarAlturas(seq);
    assert.deepStrictEqual(seq.getMidicents(), [6400, 6000]);
    assert.deepStrictEqual(seq.getDuraciones(), [1000, 250]);
});

test('retrogradarDuraciones invierte el orden de las duraciones y recomputa inicios', () => {
    const seq = seqDeAMS('4C N 4E B');
    Heuristicos.retrogradarDuraciones(seq);
    assert.deepStrictEqual(seq.getDuraciones(), [2000, 1000]);
    assert.deepStrictEqual(seq.getInicios(), [0, 2000]);
    assert.deepStrictEqual(seq.getMidicents(), [6000, 6400]);
});

test('expandirAlturas estira en torno al eje según la escala', () => {
    const seq = seqDeAMS('4C N 4E N');
    Heuristicos.expandirAlturas(seq, 7200, 2);
    assert.deepStrictEqual(seq.getMidicents(), [4800, 5600]);
});

test('expandirDuraciones multiplica las duraciones', () => {
    const seq = seqDeAMS('4C N 4E B');
    Heuristicos.expandirDuraciones(seq, 1.5);
    assert.deepStrictEqual(seq.getDuraciones(), [1500, 3000]);
});

test('desordenarAlturas preserva el multiset de alturas y las duraciones', () => {
    const seq = seqDeAMS('4C N 4E S 4G C');
    const originales = [...seq.getDuraciones()];
    Heuristicos.desordenarAlturas(seq);
    assert.deepStrictEqual([...seq.getMidicents()].sort((a, b) => a - b), [6000, 6400, 6700]);
    assert.deepStrictEqual(seq.getDuraciones(), originales);
});

test('desordenarDuraciones NUNCA cambia las alturas (regresión)', () => {
    const seq = seqDeAMS('4C N 4E S 4G C');
    const originales = [...seq.getMidicents()];
    Heuristicos.desordenarDuraciones(seq);
    assert.deepStrictEqual(seq.getMidicents(), originales);
    assert.deepStrictEqual([...seq.getDuraciones()].sort((a, b) => a - b), [250, 500, 1000]);
    assert.strictEqual(seq.getDuracionTotal(), 1750);
});

test('transmutarAlturas reemplaza las alturas con las de la secuencia B (cíclico)', () => {
    const seqA = seqDeAMS('4C N 4E N 4G N');
    const seqB = seqDeAMS('5C N 5D N');
    Heuristicos.transmutarAlturas(seqA, seqB);
    assert.deepStrictEqual(seqA.getMidicents(), [7200, 7400, 7200]);
});

test('transmutarAlturas respeta los silencios de A', () => {
    const seqA = seqDeAMS('R N 4C N 4E N');
    const seqB = seqDeAMS('5C N 5D N');
    Heuristicos.transmutarAlturas(seqA, seqB);
    assert.deepStrictEqual(seqA.getMidicents(), [0, 7200, 7400]);
});

test('transmutarDuraciones reemplaza las duraciones con las de B (cíclico)', () => {
    const seqA = seqDeAMS('4C N 4E B 4G N');
    const seqB = seqDeAMS('5A C 5B S');
    Heuristicos.transmutarDuraciones(seqA, seqB);
    assert.deepStrictEqual(seqA.getDuraciones(), [500, 250, 500]);
    assert.deepStrictEqual(seqA.getInicios(), [0, 500, 750]);
});

test('transmutarAlturas con B sin notas no altera A', () => {
    const seqA = seqDeAMS('4C N 4E N');
    const seqB = seqDeAMS('R N');
    Heuristicos.transmutarAlturas(seqA, seqB);
    assert.deepStrictEqual(seqA.getMidicents(), [6000, 6400]);
});
