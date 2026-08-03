const {test} = require('node:test');
const assert = require('node:assert');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const {Reproductor} = require('../../src/Reproductor.js');

test('midicent2hz: A4 (6900 mc) son exactamente 440 Hz', () => {
    assert.strictEqual(Reproductor.midicent2hz(6900), 440);
    assert.ok(Math.abs(Reproductor.midicent2hz(6000) - 261.63) < 0.01); // Do central ~261.63 Hz
});

test('en Node no existe AudioContext y no se puede reproducir', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('4C N 4E N');
    const reproductor = new Reproductor(seq);
    assert.strictEqual(reproductor.contexto, null);
    assert.strictEqual(reproductor.playing, false);
});

test('la construcción no toca ventanas ni requiere navegador', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('4C N');
    const reproductor = new Reproductor(seq, {volumen: 0.5, tipoOnda: 'triangle'});
    assert.strictEqual(reproductor.opciones.volumen, 0.5);
    assert.strictEqual(reproductor.opciones.tipoOnda, 'triangle');
    assert.deepStrictEqual(reproductor.seq.getMidicents(), [6000]);
});
