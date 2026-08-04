const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {crc32, crearZip} = require('../../src/zip.js');
const {MIDIexport} = require('../../src/MIDIexport.js');
const Persistencia = require('../../src/Persistencia.js');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');

// ------- pequeño lector de ZIP solo para verificar la salida -------
function leerU32(b, p){ return ((b[p] | b[p+1] << 8 | b[p+2] << 16 | b[p+3] << 24) >>> 0); }
function leerU16(b, p){ return (b[p] | b[p+1] << 8); }

/** Banco "legacy" con lista plana de secuencias (sin grupos): es el único
 *  formato que sigue soportando MIDIexport.etiquetaSecuencia. */
function bancoLegacy(nombre, secuencias){
    const banco = {
        nombre,
        secuencias,
        bancoIndice: 0,
        setIndice(i){ this.bancoIndice = i; },
        setNombre(n){ this.nombre = n; },
        getNombre(){ return this.nombre; },
        getIndice(){ return this.bancoIndice; },
    };
    return banco;
}

function leerZIP(zip){
    const b = Array.from(zip);
    const entradas = [];
    let pos = 0;
    while (b[pos] === 0x50 && b[pos+1] === 0x4B && b[pos+2] === 0x03 && b[pos+3] === 0x04){
        const nameLen = leerU16(b, pos + 26);
        const extraLen = leerU16(b, pos + 28);
        const crc = leerU32(b, pos + 14);
        const compSize = leerU32(b, pos + 18);
        const uncompSize = leerU32(b, pos + 22);
        const nombre = String.fromCharCode(...b.slice(pos + 30, pos + 30 + nameLen));
        const ini = pos + 30 + nameLen + extraLen;
        entradas.push({nombre, crc, compSize, uncompSize, datos: b.slice(ini, ini + compSize)});
        pos = ini + compSize;
    }
    // directorio central: debe empezar con PK\x01\x02
    assert.deepStrictEqual(b.slice(pos, pos + 4), [0x50, 0x4B, 0x01, 0x02], 'directorio central presente');
    // y terminar con el EOCD PK\x05\x06
    const eocd = b.length - 22;
    assert.deepStrictEqual(b.slice(eocd, eocd + 4), [0x50, 0x4B, 0x05, 0x06], 'EOCD presente');
    assert.strictEqual(leerU16(b, eocd + 10), entradas.length, 'total de entradas en EOCD');
    assert.strictEqual(leerU32(b, eocd + 16), pos, 'offset del directorio central');
    assert.strictEqual(leerU32(b, eocd + 12), eocd - pos, 'tamaño del directorio central');
    return entradas;
}

test('crc32 coincide con el vector de referencia y con zlib', () => {
    const ref = new TextEncoder().encode('123456789');
    assert.strictEqual(crc32(ref), 0xCBF43926);
    assert.strictEqual(crc32(ref), require('node:zlib').crc32(Buffer.from(ref)));
});

test('crearZip produce un ZIP con la estructura correcta', () => {
    const a = new TextEncoder().encode('hola mundo');
    const b = new TextEncoder().encode('x'.repeat(1000));
    const zip = crearZip([{nombre: 'a.txt', bytes: a}, {nombre: 'b.bin', bytes: b}]);

    assert.deepStrictEqual(Array.from(zip.slice(0, 4)), [0x50, 0x4B, 0x03, 0x04]);
    const entradas = leerZIP(zip);
    assert.strictEqual(entradas.length, 2);
    assert.strictEqual(entradas[0].nombre, 'a.txt');
    assert.strictEqual(entradas[0].compSize, a.length);
    assert.strictEqual(entradas[0].uncompSize, a.length);
    assert.deepStrictEqual(entradas[0].datos, Array.from(a));
    assert.strictEqual(entradas[1].nombre, 'b.bin');
    assert.deepStrictEqual(entradas[1].datos, Array.from(b));
});

test('crearZip soporta Uint8Array y Array como entrada', () => {
    const zip = crearZip([{nombre: 'n.txt', bytes: [1, 2, 3]}]);
    const [ent] = leerZIP(zip);
    assert.deepStrictEqual(ent.datos, [1, 2, 3]);
    assert.strictEqual(ent.crc, crc32(new Uint8Array([1, 2, 3])));
});

test('bancos2zip genera un .mid por secuencia etiquetado <seq> - <grupo>', () => {
    const banco = new BancoDeSecuencias('Test');
    banco.addSeqAMS('j1 n 4c 4d 4e');
    banco.addSeqAMS('j1 n 4f 4g 4a');
    banco.setIndice(2);

    const zip = MIDIexport.bancos2zip(banco);
    const entradas = leerZIP(zip);
    assert.deepStrictEqual(entradas.map(e => e.nombre), ['seq_1 - grupo_A.mid', 'seq_2 - grupo_A.mid']);
    for (const ent of entradas){
        assert.deepStrictEqual(ent.datos.slice(0, 4), [0x4D, 0x54, 0x68, 0x64], 'cada entrada es un SMF');
    }
});

test('etiquetaSecuencia (legacy, sin grupos) usa indices banco/seq', () => {
    const banco = bancoLegacy('x', []);
    banco.setIndice(5);
    assert.strictEqual(MIDIexport.etiquetaSecuencia(banco, 3), '5_3');
    assert.strictEqual(MIDIexport.etiquetaSecuencia(null, 0), '0_0');
    assert.strictEqual(MIDIexport.etiquetaSecuencia([1, 2], 1), '0_1');
});

test('etiquetaSecuencia usa los nombres propios de banco y secuencia', () => {
    const banco = bancoLegacy('Mi Banco', [BancoDeSecuencias.secuenciaDesdeAMS('j1 n 4c 4d 4e')]);
    banco.setIndice(2);
    banco.secuencias[0].setNombre('Melodía');
    assert.strictEqual(MIDIexport.etiquetaSecuencia(banco, 0), 'Mi Banco_Melodía');

    banco.setNombre('[AsuarBank] ');   // nombre por defecto: no cuenta
    assert.strictEqual(MIDIexport.etiquetaSecuencia(banco, 0), 'Melodía');
});

test('etiquetaSecuencia ignora nombres por defecto y vuelve a los indices', () => {
    const banco = bancoLegacy('x', [BancoDeSecuencias.secuenciaDesdeAMS('j1 n 4c 4d 4e')]);
    banco.setIndice(2);
    assert.strictEqual(MIDIexport.etiquetaSecuencia(banco, 0), '2_0');
});

test('etiquetaSecuencia saneja caracteres ilegales del nombre', () => {
    const banco = bancoLegacy('A/B:C', [BancoDeSecuencias.secuenciaDesdeAMS('j1 n 4c')]);
    banco.secuencias[0].setNombre('canción?');
    assert.strictEqual(MIDIexport.etiquetaSecuencia(banco, 0), 'A_B_C_canción_');
});

test('sanitizarNombre y esNombrePorDefecto', () => {
    assert.strictEqual(MIDIexport.sanitizarNombre('  Mi  Banco '), 'Mi Banco');
    assert.strictEqual(MIDIexport.sanitizarNombre('a/b\\c:d*e?f"g<h>i|'), 'a_b_c_d_e_f_g_h_i_');
    assert.strictEqual(MIDIexport.sanitizarNombre('..hola..'), 'hola');
    assert.strictEqual(MIDIexport.sanitizarNombre(''), '');
    assert.strictEqual(MIDIexport.sanitizarNombre(42), '');

    assert.strictEqual(MIDIexport.esNombrePorDefecto(''), true);
    assert.strictEqual(MIDIexport.esNombrePorDefecto('[AsuarBank] '), true);
    assert.strictEqual(MIDIexport.esNombrePorDefecto('[AsuarSeq] '), true);
    assert.strictEqual(MIDIexport.esNombrePorDefecto('AsuarSeq_3'), true);
    assert.strictEqual(MIDIexport.esNombrePorDefecto('Melodía'), false);
});

test('nombreArchivoBanco devuelve el nombre propio o comdasuar', () => {
    assert.strictEqual(MIDIexport.nombreArchivoBanco(new BancoDeSecuencias('Mi Banco')), 'Mi Banco');
    assert.strictEqual(MIDIexport.nombreArchivoBanco(new BancoDeSecuencias()), 'comdasuar');
    assert.strictEqual(MIDIexport.nombreArchivoBanco(new BancoDeSecuencias('[AsuarBank] ')), 'comdasuar');
    assert.strictEqual(MIDIexport.nombreArchivoBanco(null), 'comdasuar');
});

test('bancos2zip usa los nombres propios de secuencia y grupo', () => {
    const banco = new BancoDeSecuencias('Concierto');
    banco.addSeqAMS('j1 n 4c 4d 4e');
    banco.addSeqAMS('j1 n 4f 4g 4a');
    banco.getSeq(0).setNombre('Adagio');
    banco.getSeq(1).setNombre('Allegro');

    const zip = MIDIexport.bancos2zip(banco);
    const entradas = leerZIP(zip);
    assert.deepStrictEqual(entradas.map(e => e.nombre), ['Adagio - grupo_A.mid', 'Allegro - grupo_A.mid']);
});

test('Persistencia.guardarZIP escribe y lee un ZIP real', () => {
    const banco = new BancoDeSecuencias('Test');
    banco.addSeqAMS('j1 n 4c 4d 4e');
    const zip = MIDIexport.bancos2zip(banco);
    const ruta = path.join(os.tmpdir(), 'comdasuar_test_' + Date.now() + '.zip');
    Persistencia.guardarZIP(zip, ruta);
    const deDisco = fs.readFileSync(ruta);
    assert.deepStrictEqual(Array.from(deDisco), Array.from(zip));
    fs.unlinkSync(ruta);
});
