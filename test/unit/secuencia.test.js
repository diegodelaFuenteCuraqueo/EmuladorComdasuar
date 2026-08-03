const {test} = require('node:test');
const assert = require('node:assert');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const {SecuenciaAsuar} = require('../../src/SecuenciaAsuar.js');
const {NotaAsuar} = require('../../src/NotaAsuar.js');

test('secuenciaDesdeAMS crea notas con midicents y duraciones correctas', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('4C N 4E S');
    assert.strictEqual(seq.getNotas().length, 2);
    assert.deepStrictEqual(seq.getMidicents(), [6000, 6400]);
    assert.deepStrictEqual(seq.getDuraciones(), [1000, 250]);
});

test('los inicios son acumulativos y la duración total es la suma', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('4C N 4E S 4G C');
    assert.deepStrictEqual(seq.getInicios(), [0, 1000, 1250]);
    assert.strictEqual(seq.getDuracionTotal(), 1750);
});

test('el tempo por defecto es negra = 60 pulsos por minuto', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('4C N');
    assert.deepStrictEqual(seq.getTempo(), {figura: 'N', pulsosPorMin: 60, duracionPulso: 1000});
});

test('N=120 escala las duraciones a la mitad', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('N=120 4C N 4E N');
    assert.deepStrictEqual(seq.getDuraciones(), [500, 500]);
    assert.deepStrictEqual(seq.getInicios(), [0, 500]);
    assert.strictEqual(seq.getDuracionTotal(), 1000);
    assert.strictEqual(seq.getTempo().duracionPulso, 500);
});

test('un silencio (R) no suena pero ocupa tiempo', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('R N 4C N');
    assert.deepStrictEqual(seq.getMidicents(), [0, 6000]);
    assert.deepStrictEqual(seq.getInicios(), [0, 1000]);
});

test('setMidicents reemplaza las alturas', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('4C N 4E N');
    seq.setMidicents([7000, 7200]);
    assert.deepStrictEqual(seq.getMidicents(), [7000, 7200]);
});

test('setDuraciones reemplaza las duraciones y recomputa inicios', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('4C N 4E N 4G N');
    seq.setDuraciones([500, 1000, 250]);
    assert.deepStrictEqual(seq.getDuraciones(), [500, 1000, 250]);
    assert.deepStrictEqual(seq.getInicios(), [0, 500, 1500]);
    assert.strictEqual(seq.getDuracionTotal(), 1750);
});

test('getBachMidicents/getBachInicios/getBachDuraciones ignoran silencios', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('R N 4C N 4E S');
    assert.strictEqual(seq.getBachMidicents(), '(6000 6400)');
    assert.strictEqual(seq.getBachInicios(), '(1000 2000)');
    assert.strictEqual(seq.getBachDuraciones(), '(1000 250)');
});

test('addNota encola y computa inicios', () => {
    const seq = new SecuenciaAsuar('prueba');
    seq.addNota(new NotaAsuar('4C', 'N'));
    seq.addNota(new NotaAsuar('4E', 'S'));
    assert.strictEqual(seq.getNotas().length, 2);
    assert.deepStrictEqual(seq.getInicios(), [0, 1000]);
    assert.strictEqual(seq.getDuracionTotal(), 1250);
});
