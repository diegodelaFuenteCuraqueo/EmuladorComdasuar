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

test('duracionVexflow: subdivisiones nuevas (6/7/9/10-16) agrupan con tuplet', () => {
    assert.deepEqual(av.duracionVexflow('6NS'), {
        figuras: [{duracion: '4', ligada: false}, {duracion: '16', ligada: false}],
        tuplet: 6,
    });
    assert.deepEqual(av.duracionVexflow('7NCS'), {
        figuras: [{duracion: '4', ligada: false}, {duracion: '8', ligada: false}, {duracion: '16', ligada: false}],
        tuplet: 7,
    });
    assert.deepEqual(av.duracionVexflow('10NS'), {
        figuras: [{duracion: '4', ligada: false}, {duracion: '16', ligada: false}],
        tuplet: 10,
    });
    assert.deepEqual(av.duracionVexflow('16NC'), {
        figuras: [{duracion: '4', ligada: false}, {duracion: '8', ligada: false}],
        tuplet: 16,
    });
});

test('duracionVexflow: tuplet de una sola figura conserva la figura con su número', () => {
    assert.deepEqual(av.duracionVexflow('3N'), {figuras: [{duracion: '4', ligada: false}], tuplet: 3});
    assert.deepEqual(av.duracionVexflow('3S'), {figuras: [{duracion: '16', ligada: false}], tuplet: 3});
    assert.deepEqual(av.duracionVexflow('5C'), {figuras: [{duracion: '8', ligada: false}], tuplet: 5});
    assert.deepEqual(av.duracionVexflow('7S'), {figuras: [{duracion: '16', ligada: false}], tuplet: 7});
    assert.deepEqual(av.duracionVexflow('6S'), {figuras: [{duracion: '16', ligada: false}], tuplet: 6});
    assert.deepEqual(av.duracionVexflow('7F'), {figuras: [{duracion: '32', ligada: false}], tuplet: 7});
    assert.deepEqual(av.duracionVexflow('9F'), {figuras: [{duracion: '32', ligada: false}], tuplet: 9});
    assert.deepEqual(av.duracionVexflow('10S'), {figuras: [{duracion: '16', ligada: false}], tuplet: 10});
    assert.deepEqual(av.duracionVexflow('16M'), {figuras: [{duracion: '64', ligada: false}], tuplet: 16});
});

test('duracionVexflow: subdivisión sin figura explícita se aproxima a la más cercana', () => {
    // "3P" (solo puntillo) no tiene figura: cae a redonda por defecto
    assert.deepEqual(av.duracionVexflow('3P'), {figuras: [{duracion: '1', ligada: false}], tuplet: null});
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
    const seq = secuenciaDesdeAMS('J0 4C 3NS 5E 0N');
    const voces = new AsuarVexflow(seq).compilar().compases[0].voces;
    const tuplet = voces.agudos.map(n => n.tuplet);
    assert.deepEqual(tuplet, [3, 3, null]);
});

test('compilar: tuplet de una sola figura (3S) conserva la figura y su número', () => {
    const seq = secuenciaDesdeAMS('J0 4C 3S 5E 3S 4G 3S 4F 0N');
    const voces = new AsuarVexflow(seq).compilar().compases[0].voces;
    assert.deepEqual(voces.agudos.slice(0, 3).map(n => n.duracion), ['16', '16', '16']);
    assert.deepEqual(voces.agudos.map(n => n.tuplet), [3, 3, 3, null]);
});

test('compilar: subdivisiones nuevas (6c, 7f, 9f, 10s) conservan figura y tuplet', () => {
    const agudosDe = (ams) => new AsuarVexflow(secuenciaDesdeAMS(ams)).compilar().compases[0].voces.agudos;

    // seisillo (6 en el tiempo de 4): 6 semicorcheas
    const p1 = ['4C', '5E', '4G', '4D', '4E', '4F'];
    let a = agudosDe('J0 4C 6S ' + p1.map(p => p + ' 6S').join(' '));
    assert.deepEqual(a.slice(0, 6).map(n => n.duracion), Array(6).fill('16'));
    assert.deepEqual(a.slice(0, 6).map(n => n.tuplet), Array(6).fill(6));

    // septillo 7:8: 7 fusas en el tiempo de una negra
    const p2 = ['4C', '5E', '4G', '4D', '4E', '4F', '5G'];
    a = agudosDe('J0 4C 7F ' + p2.map(p => p + ' 7F').join(' '));
    assert.deepEqual(a.slice(0, 7).map(n => n.duracion), Array(7).fill('32'));
    assert.deepEqual(a.slice(0, 7).map(n => n.tuplet), Array(7).fill(7));

    // 9 en el tiempo de 8: 9 fusas
    const p3 = ['4C', '5E', '4G', '4D', '4E', '4F', '5G', '4A', '5C'];
    a = agudosDe('J0 4C 9F ' + p3.map(p => p + ' 9F').join(' '));
    assert.deepEqual(a.slice(0, 9).map(n => n.duracion), Array(9).fill('32'));
    assert.deepEqual(a.slice(0, 9).map(n => n.tuplet), Array(9).fill(9));

    // 10 en el tiempo de 9: 10 semicorcheas
    const p4 = ['4C', '5E', '4G', '4D', '4E', '4F', '5G', '4A', '5C', '5E'];
    a = agudosDe('J0 4C 10S ' + p4.map(p => p + ' 10S').join(' '));
    assert.deepEqual(a.slice(0, 10).map(n => n.duracion), Array(10).fill('16'));
    assert.deepEqual(a.slice(0, 10).map(n => n.tuplet), Array(10).fill(10));
});

test('proporciones de los grupos irregulares (ejemplos de Asuar)', () => {
    // 3c = 6c nota a nota (doble tresillo): ambas 2000ms en 6 notas
    assert.equal(totalMS('J1 3C 4C 4E 4G 4D 4F 4A'), totalMS('J1 6C 4C 4E 4G 4D 4F 4A'));
    // 7f = negra dividida en 7 = 8 fusas (1000ms)
    assert.equal(totalMS('J1 7F 4C 4E 4G 4D 4F 4A 4B'), totalMS('J1 F 4C 4E 4G 4D 4F 4A 4B 5C'));
    // 5c = 5 corcheas en el tiempo de 4 (media = 2000ms)
    assert.equal(totalMS('J1 5C 4C 4E 4G 4D 4F'), totalMS('J1 C 4C 4E 4G 4D'));
    // 9f = 9 fusas en el tiempo de 8 (1000ms)
    assert.equal(totalMS('J1 9F 4C 4E 4G 4D 4F 4A 4B 5C 5E'), totalMS('J1 F 4C 4E 4G 4D 4F 4A 4B 5C'));
});

function totalMS(ams){
    const seq = secuenciaDesdeAMS(ams);
    const ms = seq.getNotas().map(n => n.duracion.duracionMS);
    return Math.round(ms.reduce((a, b) => a + b, 0));
}

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
