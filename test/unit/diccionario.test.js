const {test} = require('node:test');
const assert = require('node:assert');
const {DiccionarioAsuar, getDiccionarioAsuar} = require('../../src/diccionarioAsuar.js');

const AMS = getDiccionarioAsuar();

test('getDiccionarioAsuar devuelve siempre la misma instancia (singleton)', () => {
    assert.strictEqual(getDiccionarioAsuar(), getDiccionarioAsuar());
    assert.ok(getDiccionarioAsuar() instanceof DiccionarioAsuar);
});

test('tabla de ritmos según la notación Asuar', () => {
    assert.deepStrictEqual(AMS.ritmos, {
        L: 8000, R: 4000, B: 2000, N: 1000, C: 500, S: 250, F: 125, M: 62.5, P: 0.5
    });
});

test('dur2ms convierte figuras simples', () => {
    assert.strictEqual(AMS.dur2ms('N'), 1000);
    assert.strictEqual(AMS.dur2ms('B'), 2000);
    assert.strictEqual(AMS.dur2ms('S'), 250);
    assert.strictEqual(AMS.dur2ms('M'), 62.5);
});

test('dur2ms suma figuras consecutivas', () => {
    assert.strictEqual(AMS.dur2ms('NN'), 2000);
    assert.strictEqual(AMS.dur2ms('BN'), 3000);
});

test('dur2ms aplica puntillos (mitad de la figura anterior)', () => {
    assert.strictEqual(AMS.dur2ms('NP'), 1500);
    assert.strictEqual(AMS.dur2ms('NPB'), 3500);
});

test('dur2ms aplica grupos irregulares (subdivisiones)', () => {
    assert.ok(Math.abs(AMS.dur2ms('3N') - 666.6) < 0.01);
    assert.ok(Math.abs(AMS.dur2ms('5N') - 800) < 0.01);
    assert.ok(Math.abs(AMS.dur2ms('7N') - 875) < 0.01);
    assert.strictEqual(AMS.dur2ms('0N'), 1000);
});

test('alt2mn convierte octava+nota', () => {
    assert.strictEqual(AMS.alt2mn('4C'), 60);
    assert.strictEqual(AMS.alt2mn('5A'), 81);
    assert.strictEqual(AMS.alt2mn('3G'), 55);
    assert.strictEqual(AMS.alt2mn('1C'), 24);
});

test('alt2mn aplica alteraciones (sostenido/bemol/becuadro)', () => {
    assert.strictEqual(AMS.alt2mn('4CS'), 61);
    assert.strictEqual(AMS.alt2mn('4CW'), 59);
    assert.strictEqual(AMS.alt2mn('3BQ'), 59);
    assert.strictEqual(AMS.alt2mn('4CU'), 60.5);
});

test('alt2mc multiplica por 100', () => {
    assert.strictEqual(AMS.alt2mc('4C'), 6000);
    assert.strictEqual(AMS.alt2mc('5A'), 8100);
});

test('R (silencio) convierte a 0', () => {
    assert.strictEqual(AMS.alt2mn('R'), 0);
    assert.strictEqual(AMS.alt2mc('R'), 0);
});
