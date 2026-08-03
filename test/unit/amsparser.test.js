const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {AMSparser} = require('../../src/AMSparser.js');

const SCORES = path.join(__dirname, '..', 'scores');
const cargarScore = (name) => fs.readFileSync(path.join(SCORES, name), 'utf8');

function parse(ams){
    const parser = new AMSparser();
    return parser.parse(ams);
}

test('parse entrega alturas, duraciones y tempo plano (J0)', () => {
    const {alturas, duraciones, tempo} = parse('4C N 4E S');
    assert.deepStrictEqual(alturas, ['4C', '4E']);
    assert.deepStrictEqual(duraciones, ['N', 'S']);
    assert.strictEqual(tempo.figura, 'N');
    assert.strictEqual(tempo.pulsosPorMin, 60);
    assert.strictEqual(tempo.duracionPulso, 1000);
});

test('la barra (/) repite la altura anterior', () => {
    const {alturas} = parse('4C N / N');
    assert.deepStrictEqual(alturas, ['4C', '4C']);
});

test('la barra (/) repite la duración anterior', () => {
    const {duraciones} = parse('4C N 4E /');
    assert.deepStrictEqual(duraciones, ['N', 'N']);
});

test('aplica redundancia de octava (altura sin octava hereda la anterior)', () => {
    const {alturas} = parse('4C N C S 3E F');
    assert.deepStrictEqual(alturas, ['4C', '4C', '3E']);
});

test('aplica redundancia de grupo irregular', () => {
    const {duraciones} = parse('4C 3N 4E F');
    assert.deepStrictEqual(duraciones, ['3N', '3F']);
});

test('J1 fija un ritmo constante', () => {
    const {alturas, duraciones} = parse('J1 S 4C 4E 4G');
    assert.deepStrictEqual(alturas, ['4C', '4E', '4G']);
    assert.deepStrictEqual(duraciones, ['S', 'S', 'S']);
});

test('J2 fija una altura constante', () => {
    const {alturas, duraciones} = parse('J2 4C N S F');
    assert.deepStrictEqual(alturas, ['4C', '4C', '4C']);
    assert.deepStrictEqual(duraciones, ['N', 'S', 'F']);
});

test('J4 repite el pasaje las veces indicadas (ej6: 17 notas)', () => {
    const ej6 = cargarScore('ej6.txt'); // J4 8 4G F 5A / J0 4G B
    const {alturas, duraciones} = parse(ej6);
    assert.strictEqual(alturas.length, 17);
    assert.strictEqual(duraciones.length, 17);
    assert.deepStrictEqual(alturas.slice(0, 3), ['4G', '5A', '4G']);
    assert.deepStrictEqual(duraciones.slice(0, 3), ['F', 'F', 'F']);
});

test('J5 repite un pasaje indicado (ej5: 10 notas)', () => {
    const ej5 = cargarScore('ej5.txt');
    const {alturas} = parse(ej5);
    assert.strictEqual(alturas.length, 10);
});

test('J5 repite el pasaje indicado en ej4 (17 notas)', () => {
    const ej4 = cargarScore('ej4.txt'); // C B 3G / J5 1 7 4C S
    const {alturas} = parse(ej4);
    assert.strictEqual(alturas.length, 17);
});

test('los cambios de tempo se reflejan en el objeto tempo', () => {
    const {tempo} = parse('N=120 4C N');
    assert.strictEqual(tempo.figura, 'N');
    assert.strictEqual(tempo.pulsosPorMin, 120);
    assert.strictEqual(tempo.duracionPulso, 500);
});

test('el texto se normaliza a mayúsculas y sin saltos de línea', () => {
    const parser = new AMSparser();
    parser.cargarPartitura(' 4c\tn \n4e S ');
    assert.deepStrictEqual(parser.listaDePalabras, ['4C', 'N', '4E', 'S']);
});
