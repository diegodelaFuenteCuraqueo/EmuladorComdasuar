const {test} = require('node:test');
const assert = require('node:assert');
const {ResaltadorAMS} = require('../../src/gui/ResaltadorAMS.js');

const resaltador = new ResaltadorAMS();

/** Ayuda: resalta y devuelve solo los tipos en orden (ignora el blanco). */
function tipos(texto){
    return resaltador.resaltar(texto).filter(s => s.tipo !== 'texto').map(s => s.tipo);
}

/** Ayuda: reconstruye el texto original a partir de los segmentos. */
function reconstruir(texto){
    return resaltador.resaltar(texto).map(s => s.texto).join('');
}

test('los segmentos reconstruyen exactamente el texto de entrada', () => {
    const texto = 'j1 n  6b\n3as\t5e // comentario?';
    assert.strictEqual(reconstruir(texto), texto);
    assert.strictEqual(reconstruir(''), '');
});

test('modo J0: alterna altura (verde) y duración (azul)', () => {
    assert.deepStrictEqual(tipos('4C N 4D C'), ['altura', 'duracion', 'altura', 'duracion']);
    assert.deepStrictEqual(tipos('C N'), ['altura', 'duracion']);
});

test('el silencio R en posición de altura es verde', () => {
    assert.deepStrictEqual(tipos('R N 4C C'), ['altura', 'duracion', 'altura', 'duracion']);
});

test('la redonda R en posición de duración es azul', () => {
    assert.deepStrictEqual(tipos('4C R'), ['altura', 'duracion']);
});

test('acordes y desplazamientos son alturas válidas', () => {
    assert.deepStrictEqual(tipos('4C.E.G.>C N 4CrEG N 4CER R'), [
        'altura', 'duracion', 'altura', 'duracion', 'altura', 'duracion'
    ]);
});

test('comandos J y sus argumentos son púrpura', () => {
    assert.deepStrictEqual(tipos('J1 N 4C 4D'), ['modo', 'modo', 'altura', 'altura']);
    assert.deepStrictEqual(tipos('J2 4C N C'), ['modo', 'modo', 'duracion', 'duracion']);
    assert.deepStrictEqual(tipos('J4 2 4C N'), ['modo', 'modo', 'altura', 'duracion']);
    assert.deepStrictEqual(tipos('J5 1 3 4C N'), ['modo', 'modo', 'modo', 'altura', 'duracion']);
});

test('cambio de tempo N=60 es púrpura; malformado es error', () => {
    assert.deepStrictEqual(tipos('N=60 4C N'), ['modo', 'altura', 'duracion']);
    assert.deepStrictEqual(tipos('=60 4C N'), ['error', 'altura', 'duracion']);
});

test('la barra / es repetir (neutro) en ambos slots', () => {
    assert.deepStrictEqual(tipos('4C N / /'), ['altura', 'duracion', 'repetir', 'repetir']);
});

test('palabras inválidas en su posición son rojas', () => {
    assert.deepStrictEqual(tipos('4C XY'), ['altura', 'error']);
    assert.deepStrictEqual(tipos('XY N'), ['error', 'duracion']);
    assert.deepStrictEqual(tipos('4C N 4'), ['altura', 'duracion', 'error']);
    assert.deepStrictEqual(tipos('J1 N XY'), ['modo', 'modo', 'error']);
    assert.deepStrictEqual(tipos('J2 4C NP'), ['modo', 'modo', 'duracion']);
});

test('separadores de acorde mal ubicados son rojos', () => {
    assert.deepStrictEqual(tipos('4C..E N'), ['error', 'duracion']);
    assert.deepStrictEqual(tipos('.4C N'), ['error', 'duracion']);
    assert.deepStrictEqual(tipos('4C. N'), ['error', 'duracion']);
});

test('esAltura valida alturas, acordes y desplazamientos', () => {
    for (const ok of ['4C', 'C', '>C', '<<C', '>>C', '4C.E.G.>C', '4CrEG', '4CER', '6FS', '4C.4E', '1A', '8B']){
        assert.ok(resaltador.esAltura(ok), 'debe ser altura: ' + ok);
    }
    for (const bad of ['', 'R', '4R', '4', 'H', '4H', '>', '>>>C', '4C..E', '4C.', '.4C', '>R', '4CSW']){
        assert.ok(!resaltador.esAltura(bad), 'no debe ser altura: ' + bad);
    }
});

test('esDuracion valida figuras, grupos y puntillos', () => {
    for (const ok of ['N', 'R', 'B', 'C', 'S', 'F', 'M', 'L', 'NP', 'BCM', '3S', '5C', '7B', '0F', '3NP', 'NC']){
        assert.ok(resaltador.esDuracion(ok), 'debe ser duración: ' + ok);
    }
    for (const bad of ['', 'P', '3', '0', '8', '4C', '3X', 'PP', 'N3']){
        assert.ok(!resaltador.esDuracion(bad), 'no debe ser duración: ' + bad);
    }
});

test('la partitura de ejemplo del manual se colorea sin errores', () => {
    const texto = 'j1 n 6b 3as 5e 4f 3ew d 5aw 4a g 6fs 4c';
    assert.ok(!tipos(texto).includes('error'));
});

test('mezcla de modos en una sola partitura', () => {
    const texto = 'J1 3S 3C D E F J0 E 0B N=60 4C N';
    const t = tipos(texto);
    assert.ok(!t.includes('error'), 'todos válidos: ' + t.join(' '));
});
