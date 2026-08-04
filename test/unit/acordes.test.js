const {test} = require('node:test');
const assert = require('node:assert');
const {AMSparser} = require('../../src/AMSparser.js');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const {SecuenciaAsuar} = require('../../src/SecuenciaAsuar.js');
const {MIDIexport} = require('../../src/MIDIexport.js');
const Heuristicos = require('../../src/Heuristicos.js');

const parse = (ams) => new AMSparser().parse(ams).alturas;
const seqDeAMS = (ams) => BancoDeSecuencias.secuenciaDesdeAMS(ams);

// ---------------- desplazamientos de octava (<, >) ----------------
test('>C sube una octava relativa a la última octava explícita (ejemplo del diseño)', () => {
    const alturas = parse('4C N G N 4C N >C N 4C N E N');
    assert.deepStrictEqual(alturas, ['4C', '4G', '4C', '5C', '4C', '4E']);
    assert.deepStrictEqual(seqDeAMS('4C N G N 4C N >C N 4C N E N').getMidicents(),
        [6000, 6700, 6000, 7200, 6000, 6400]);
});

test('<< y >> desplazan dos octavas', () => {
    const seq = seqDeAMS('4C N >>C N <<C N');
    assert.deepStrictEqual(seq.getMidicents(), [6000, 8400, 3600]);
});

test('el desplazamiento no cambia la octava heredada por las notas siguientes', () => {
    const seq = seqDeAMS('4C N >C N G N');
    assert.deepStrictEqual(seq.getMidicents(), [6000, 7200, 6700]); // G sigue en octava 4
});

test('el desplazamiento se limita a la octava 1..8', () => {
    const seq = seqDeAMS('8C N >C N');
    assert.deepStrictEqual(seq.getMidicents(), [10800, 10800]); // 8 + 1 -> se mantiene en 8
});

// ---------------- acordes ----------------
test('los acordes aceptan puntos y forma concatenada (misma salida canónica)', () => {
    const conPuntos = parse('4C.E.G.>C N');
    const concatenado = parse('4CEG>C N');
    const concatExplicito = parse('4CEG5C N');
    assert.deepStrictEqual(conPuntos, ['4C.4E.4G.5C']);
    assert.deepStrictEqual(concatenado, conPuntos);
    assert.deepStrictEqual(concatExplicito, conPuntos);
    assert.deepStrictEqual(seqDeAMS('4C.E.G.>C N').getMidicents(), [6000, 6400, 6700, 7200]);
});

test('el acorde hereda la octava global para sus notas sin octava explícita', () => {
    assert.deepStrictEqual(seqDeAMS('4C.E.G N A N').getMidicents(), [6000, 6400, 6700, 6900]);
});

test('el acorde actualiza la octava global desde su primera nota explícita', () => {
    const seq = seqDeAMS('4C.EG N 5A N G N');
    assert.deepStrictEqual(seq.getMidicents(), [6000, 6400, 6700, 8100, 7900]);
});

// ---------------- R contextual ----------------
test('R tras una nota es una alteración de +1.5 semitonos (6000 -> 6150)', () => {
    const seq = seqDeAMS('4CR N');
    assert.deepStrictEqual(seq.getMidicents(), [6150]);
    assert.strictEqual(seq.getNotas()[0].getAlturas()[0].getAlturaAMS(), '4CR');
});

test('R como alteración es insensible a mayúsculas y funciona dentro de acordes', () => {
    const seq = seqDeAMS('4CrEG N');
    assert.deepStrictEqual(seq.getMidicents(), [6150, 6400, 6700]);
});

test('R tras una nota compone con la duración R (nota redonda): 4CER R', () => {
    const seq = seqDeAMS('4CER R');
    assert.deepStrictEqual(seq.getMidicents(), [6000, 6550]);
    assert.deepStrictEqual(seq.getDuraciones(), [4000]);
});

test('R sola es un silencio y R en duración es nota redonda (R R)', () => {
    const seq = seqDeAMS('R R');
    assert.deepStrictEqual(seq.getMidicents(), [0]);
    assert.deepStrictEqual(seq.getDuraciones(), [4000]);
});

test('R alteración no se confunde con silencio en los formatos Bach', () => {
    const seq = seqDeAMS('R N 4CR N 4E N');
    assert.strictEqual(seq.getBachMidicents(), '(6150 6400)');
    assert.strictEqual(seq.getBachDuraciones(), '(1000 1000)');
});

test('los usos inválidos de R lanzan un error', () => {
    for (const ams of ['4R N', '>R N', '<R N', '4RCGBA N', 'RCGBA N',
        '4CsA>CqR N', '4CRR N', 'CQR N', '4C.R N']){
        assert.throws(() => parse(ams), /R/, 'debe fallar: ' + ams);
    }
});

test('los separadores de acorde vacíos lanzan un error', () => {
    for (const ams of ['4C. N', '.4C N', '4C..E N']){
        assert.throws(() => parse(ams), /separador/, 'debe fallar: ' + ams);
    }
});

// ---------------- heurísticas sobre acordes ----------------
test('transportar desplaza todos los midicents de cada acorde', () => {
    const seq = seqDeAMS('4C.E.G N 4E N');
    Heuristicos.transportar(seq, 100);
    assert.deepStrictEqual(seq.getMidicents(), [6100, 6500, 6800, 6500]);
});

test('invertir invierte todos los midicents de cada acorde', () => {
    const seq = seqDeAMS('4C.E.G N');
    Heuristicos.invertir(seq, 60);
    assert.deepStrictEqual(seq.getMidicents(), [6000, 5600, 5300]);
});

test('expandirAlturas expande cada altura del acorde', () => {
    const seq = seqDeAMS('4C.E.G N');
    Heuristicos.expandirAlturas(seq, 60, 2);
    assert.deepStrictEqual(seq.getMidicents(), [6000, 6800, 7400]);
});

test('retrogradarAlturas trata los acordes como bloques atómicos', () => {
    const seq = seqDeAMS('4C.E.G N 4E N');
    Heuristicos.retrogradarAlturas(seq);
    assert.deepStrictEqual(seq.getMidicentsPorEvento(), [[6400], [6000, 6400, 6700]]);
});

test('desordenarAlturas mezcla eventos sin separar las alturas de un acorde', () => {
    const seq = seqDeAMS('4C.E.G N 4E N');
    const antes = seq.getMidicents().slice().sort((a, b) => a - b);
    Heuristicos.desordenarAlturas(seq);
    const despues = seq.getMidicents().slice().sort((a, b) => a - b);
    assert.deepStrictEqual(despues, antes);
    assert.deepStrictEqual(seq.getMidicentsPorEvento().map(e => e.length).sort(), [1, 3]);
});

test('transmutarAlturas transmuta cada altura de los acordes', () => {
    const seqA = seqDeAMS('4C.E.G N 4E N');
    const seqB = seqDeAMS('5C N');
    Heuristicos.transmutarAlturas(seqA, seqB);
    assert.deepStrictEqual(seqA.getMidicents(), [7200, 7200, 7200, 7200]);
});

// ---------------- acceso plano / por evento ----------------
test('getMidicents es plano (un midicent por altura) y setMidicents redistribuye', () => {
    const seq = seqDeAMS('4C.E.G N 4E N');
    assert.deepStrictEqual(seq.getMidicents(), [6000, 6400, 6700, 6400]);
    seq.setMidicents([1, 2, 3, 4]);
    assert.deepStrictEqual(seq.getMidicentsPorEvento(), [[1, 2, 3], [4]]);
});

test('getMidicentsPorEvento/setMidicentsPorEvento respetan la estructura de acordes', () => {
    const seq = seqDeAMS('4C.E.G N 4E N');
    const porEvento = seq.getMidicentsPorEvento();
    assert.deepStrictEqual(porEvento, [[6000, 6400, 6700], [6400]]);
    seq.setMidicentsPorEvento([[7000, 7100, 7200], [7300]]);
    assert.deepStrictEqual(seq.getMidicentsPorEvento(), [[7000, 7100, 7200], [7300]]);
});

test('esAcorde distingue acordes de notas simples', () => {
    const seq = seqDeAMS('4C.E.G N 4E N');
    assert.strictEqual(seq.getNotas()[0].esAcorde(), true);
    assert.strictEqual(seq.getNotas()[1].esAcorde(), false);
});

// ---------------- persistencia / clone ----------------
test('clone() conserva los acordes', () => {
    const seq = seqDeAMS('4C.E.G N');
    const copia = seq.clone();
    assert.deepStrictEqual(copia.getMidicentsPorEvento(), [[6000, 6400, 6700]]);
});

test('el round-trip JSON (cargarSecuencia) conserva los acordes', () => {
    const seq = seqDeAMS('4C.E.G N 4E N');
    const cargada = new SecuenciaAsuar('copia');
    cargada.cargarSecuencia(JSON.parse(JSON.stringify(seq)));
    assert.deepStrictEqual(cargada.getMidicentsPorEvento(), [[6000, 6400, 6700], [6400]]);
});

// ---------------- MIDI ----------------
test('un acorde suena todas sus alturas a la vez en el SMF', () => {
    const b = Array.from(MIDIexport.secuencia2mid(seqDeAMS('4C.E.G N')));

    // cabecera MThd (14) + pista 0 (conductor): 8 + len; luego pista 1 (secuencia)
    const lenConductor = ((b[18] << 24) | (b[19] << 16) | (b[20] << 8) | b[21]) >>> 0;
    const pos = 14 + 8 + lenConductor; // inicio del MTrk de la pista 1
    const lenTrack = ((b[pos + 4] << 24) | (b[pos + 5] << 16) | (b[pos + 6] << 8) | b[pos + 7]) >>> 0;
    const track = b.slice(pos + 8, pos + 8 + lenTrack);

    const notas = [];
    let p = 0;
    while (p < track.length){
        let delta = 0;
        while (true){
            const byte = track[p++];
            delta = (delta << 7) | (byte & 0x7F);
            if (!(byte & 0x80)) break;
        }
        const status = track[p];
        if (status === 0xFF){
            p++;                     // status
            p++;                     // tipo
            let l = 0;               // longitud (VLQ)
            while (true){
                const byte = track[p++];
                l = (l << 7) | (byte & 0x7F);
                if (!(byte & 0x80)) break;
            }
            p += l;
            continue;
        }
        notas.push({delta, status, d1: track[p + 1], d2: track[p + 2]});
        p += 3;
    }

    const ons = notas.filter(e => e.status === 0x90);
    const offs = notas.filter(e => e.status === 0x80);
    assert.strictEqual(ons.length, 3);
    assert.strictEqual(offs.length, 3);
    assert.deepStrictEqual(ons.map(e => e.d1), [0x3C, 0x40, 0x43]); // 60, 64, 67
    assert.strictEqual(ons[0].delta, 0);
    assert.strictEqual(offs[0].delta, 480);
});

// ---------------- compatibilidad ----------------
test('las secuencias de una sola nota siguen produciendo alturas idénticas', () => {
    assert.deepStrictEqual(parse('4C N 4E S 3E F'),
        ['4C', '4E', '3E']);
    assert.deepStrictEqual(parse('4C N C N 3E F'),
        ['4C', '4C', '3E']);
});
