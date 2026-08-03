/* AsuarVexflow: conversión de SecuenciaAsuar a modelo VexFlow (partitura de piano). */

const {test} = require('node:test');
const assert = require('node:assert/strict');

const {AsuarVexflow} = require('../../src/gui/AsuarVexflow.js');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');

const av = new AsuarVexflow(null);

function secuenciaDesdeAMS(ams){
    return BancoDeSecuencias.secuenciaDesdeAMS(ams);
}

// - - - claves VexFlow - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

test('claveDeMidicent: nota y octava desde midicent', () => {
    assert.equal(av.claveDeMidicent(6000), 'C/4');    // Do central
    assert.equal(av.claveDeMidicent(3600), 'C/2');
    assert.equal(av.claveDeMidicent(4800), 'C/3');
    assert.equal(av.claveDeMidicent(7200), 'C/5');
    assert.equal(av.claveDeMidicent(10800), 'C/8');
    assert.equal(av.claveDeMidicent(5900), 'B/3');    // justo bajo el Do central
    assert.equal(av.claveDeMidicent(6700), 'G/4');
    assert.equal(av.claveDeMidicent(7000), 'A#/4');
});

test('claveDeMidicent: sostenidos por defecto, bemoles al pedirlos', () => {
    assert.equal(av.claveDeMidicent(6100), 'C#/4');
    assert.equal(av.claveDeMidicent(6100, true), 'Db/4');
    assert.equal(av.claveDeMidicent(6700, true), 'G/4');   // nota natural, sin bemol
    assert.equal(av.claveDeMidicent(5800, true), 'Bb/3');  // 10 = Si bemol
    assert.equal(av.claveDeMidicent(5900, true), 'Cb/3');  // 11 = Do bemol
});

test('claveDeMidicent: cuartos de tono se redondean al semitono más cercano', () => {
    assert.equal(av.claveDeMidicent(6150), 'D/4');    // 61.5 -> 62
    assert.equal(av.claveDeMidicent(6050), 'C#/4');   // 60.5 -> 61 (Math.round sube)
});

test('claveDeAltura: la alteración W del código AMS usa bemoles', () => {
    const seq = secuenciaDesdeAMS('4CW r 5E r');
    const notas = seq.getNotas();
    assert.equal(new AsuarVexflow(seq).claveDeAltura(notas[0].getAlturas()[0]), 'Cb/3');
    assert.equal(new AsuarVexflow(seq).claveDeAltura(notas[1].getAlturas()[0]), 'E/5');
});

// - - - duraciones VexFlow - - - - - - - - - - - - - - - - - - - - - - - - - - - //

test('duracionVexflow: figuras simples', () => {
    const esperado = {R: '1', B: '2', N: '4', C: '8', S: '16', F: '32', M: '64'};
    for (const f of Object.keys(esperado)){
        const res = av.duracionVexflow(f);
        assert.deepEqual(res, {figuras: [{duracion: esperado[f], ligada: false}], tuplet: null}, f);
    }
});

test('duracionVexflow: la L (breve) se expande a dos redondas', () => {
    assert.deepEqual(av.duracionVexflow('L'), {
        figuras: [
            {duracion: '1', ligada: false},
            {duracion: '1', ligada: false},
        ],
        tuplet: null,
    });
    // en una cadena preserva la ligadura hacia el siguiente tramo
    assert.deepEqual(av.duracionVexflow('LN').figuras, [
        {duracion: '1', ligada: true},
        {duracion: '1', ligada: true},
        {duracion: '4', ligada: false},
    ]);
});

test('duracionVexflow: puntillos exactos', () => {
    assert.deepEqual(av.duracionVexflow('NP').figuras, [{duracion: '4d', ligada: false}]);
    assert.deepEqual(av.duracionVexflow('NCS').figuras, [{duracion: '4dd', ligada: false}]);   // 1.75
    assert.deepEqual(av.duracionVexflow('NB').figuras, [{duracion: '2d', ligada: false}]);      // 3
    assert.deepEqual(av.duracionVexflow('NPP').figuras, [{duracion: '4d', ligada: false}]);     // ~1.5
});

test('duracionVexflow: cadenas de figuras ligadas', () => {
    assert.deepEqual(av.duracionVexflow('RN').figuras, [
        {duracion: '1', ligada: true},
        {duracion: '4', ligada: false},
    ]);
    assert.deepEqual(av.duracionVexflow('RB').figuras, [{duracion: '1d', ligada: false}]);   // 6 cuartos = redonda con puntillo
    assert.deepEqual(av.duracionVexflow('RBN').figuras, [{duracion: '1dd', ligada: false}]); // 7 = redonda con doble puntillo
    assert.deepEqual(av.duracionVexflow('RNC').figuras, [   // 5.5 no es puntillo exacto -> ligadas
        {duracion: '1', ligada: true},
        {duracion: '4', ligada: true},
        {duracion: '8', ligada: false},
    ]);
    assert.deepEqual(av.duracionVexflow('RN').figuras, [    // 5 tampoco -> ligadas
        {duracion: '1', ligada: true},
        {duracion: '4', ligada: false},
    ]);
});

test('duracionVexflow: la R como figura es la redonda', () => {
    assert.deepEqual(av.duracionVexflow('R'), {figuras: [{duracion: '1', ligada: false}], tuplet: null});
});

test('duracionVexflow: subdivisiones 3/5/7 agrupan las figuras con tuplet', () => {
    assert.deepEqual(av.duracionVexflow('3NS'), {
        figuras: [{duracion: '4', ligada: false}, {duracion: '16', ligada: false}],
        tuplet: 3,
    });
    assert.deepEqual(av.duracionVexflow('5NCS'), {
        figuras: [{duracion: '4', ligada: false}, {duracion: '8', ligada: false}, {duracion: '16', ligada: false}],
        tuplet: 5,
    });
});

test('duracionVexflow: tuplet de una sola figura se aproxima a la figura más cercana', () => {
    // 3N = 1 cuarto * 0.6666 ~ 0.67 -> corchea con puntillo (0.75)
    assert.deepEqual(av.duracionVexflow('3N').figuras, [{duracion: '8d', ligada: false}]);
    assert.equal(av.duracionVexflow('3N').tuplet, null);
});

test('duracionVexflow: código vacío por defecto a redonda', () => {
    assert.deepEqual(av.duracionVexflow('').figuras, [{duracion: '1', ligada: false}]);
});

// - - - modelo de partitura (piano) - - - - - - - - - - - - - - - - - - - - - - - //

test('compilar: reparto agudos/graves por el Do central (6000)', () => {
    const seq = secuenciaDesdeAMS('J0 3C r 5E r 4C r 2G r');
    const modelo = new AsuarVexflow(seq).compilar();
    const voces = modelo.compases[0].voces;
    assert.deepEqual(voces.agudos.map(n => n.claves), [[], ['E/5'], ['C/4'], []]);
    assert.deepEqual(voces.graves.map(n => n.claves), [['C/3'], [], [], ['G/2']]);
});

test('compilar: ambas voces siempre con el mismo largo (silencios rellenan)', () => {
    const seq = secuenciaDesdeAMS('J0 5E r 3C r 4G r');
    const voces = new AsuarVexflow(seq).compilar().compases[0].voces;
    assert.equal(voces.agudos.length, voces.graves.length);
    const agudos = voces.agudos.map(n => n.silencio);
    const graves = voces.graves.map(n => n.silencio);
    assert.deepEqual(agudos, [false, true, false]);
    assert.deepEqual(graves, [true, false, true]);
});

test('compilar: un acorde que cruza el umbral se reparte entre las dos voces', () => {
    const seq = secuenciaDesdeAMS('4C.3G r');
    const voces = new AsuarVexflow(seq).compilar().compases[0].voces;
    assert.deepEqual(voces.agudos[0].claves, ['C/4']);
    assert.deepEqual(voces.graves[0].claves, ['G/3']);
});

test('compilar: un silencio aparece en ambas voces', () => {
    const seq = secuenciaDesdeAMS('J0 4C N R N 4E r');
    const voces = new AsuarVexflow(seq).compilar().compases[0].voces;
    const idx = voces.agudos.findIndex(n => n.silencio);
    assert.ok(idx >= 0);
    assert.equal(voces.graves[idx].silencio, true);
    assert.equal(voces.agudos[idx].duracion, '4');   // el silencio R dura una negra (N)
});

test('compilar: acordes agrupan sus claves en un solo evento', () => {
    const seq = secuenciaDesdeAMS('4C.4E.4G r');
    const voces = new AsuarVexflow(seq).compilar().compases[0].voces;
    assert.deepEqual(voces.agudos[0].claves, ['C/4', 'E/4', 'G/4']);
});

test('compilar: duraciones compuestas generan cadenas ligadas', () => {
    const seq = secuenciaDesdeAMS('J0 4C RN 5E r');
    const voces = new AsuarVexflow(seq).compilar().compases[0].voces;
    const agudos = voces.agudos;
    assert.deepEqual(agudos.slice(0, 2).map(n => n.duracion), ['1', '4']);
    assert.equal(agudos[0].ligada, true);
    assert.equal(agudos[1].ligada, false);
    assert.equal(agudos[0].evento, 0);
    assert.equal(agudos[1].evento, 0);
});

test('compilar: tuplets se propagan a ambas voces', () => {
    const seq = secuenciaDesdeAMS('J0 4C 3NS 5E r');
    const voces = new AsuarVexflow(seq).compilar().compases[0].voces;
    const tuplet = voces.agudos.map(n => n.tuplet);
    assert.deepEqual(tuplet, [3, 3, null]);
});

test('compilar: secuencia vacía no produce compases', () => {
    const seq = new (require('../../src/SecuenciaAsuar.js').SecuenciaAsuar)('vacía');
    const modelo = new AsuarVexflow(seq).compilar();
    assert.deepEqual(modelo.compases, []);
    assert.equal(modelo.nombre, 'vacía');
    assert.equal(modelo.tempo.figura, 'N');
});

test('compilar: incluye nombre y tempo', () => {
    const seq = secuenciaDesdeAMS('J0 4C r 4D r');
    seq.setNombre('La escala');
    const modelo = new AsuarVexflow(seq).compilar();
    assert.equal(modelo.nombre, 'La escala');
    assert.deepEqual(modelo.tempo, {figura: 'N', pulsosPorMin: 60});
});
