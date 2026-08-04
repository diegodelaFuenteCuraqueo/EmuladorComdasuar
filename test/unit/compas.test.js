/* Firma de tiempo "[...]": las tres formas (figura, fracción, fracción agrupada),
 * derivación de numerador/denominador y su integración con el parser AMS. */
const {test} = require('node:test');
const assert = require('node:assert');
const {AMSparser} = require('../../src/AMSparser.js');
const {BancoDeSecuencias} = require('../../src/BancoDeSecuencias.js');
const {ResaltadorAMS} = require('../../src/gui/ResaltadorAMS.js');
const {AsuarVexflow} = require('../../src/gui/AsuarVexflow.js');

test('parseCompas: forma de figuras "[NNNN]" deriva 4/4 con agrupacion unitaria', () => {
    const c = AMSparser.parseCompas('[NNNN]');
    assert.strictEqual(c.numerador, 4);
    assert.strictEqual(c.denominador, 4);
    assert.deepStrictEqual(c.agrupacion, [1, 1, 1, 1]);
    assert.deepStrictEqual(c.duraciones, [1, 1, 1, 1]);
});

test('parseCompas: "[NP.N]" y "[NPN]" derivan 5/8 agrupado [3,2]', () => {
    for (const t of ['[NP.N]', '[NPN]']){
        const c = AMSparser.parseCompas(t);
        assert.strictEqual(c.numerador, 5);
        assert.strictEqual(c.denominador, 8);
        assert.deepStrictEqual(c.agrupacion, [3, 2]);
    }
});

test('parseCompas: "[CCCCC]" deriva 5/8 con agrupacion [1,1,1,1,1]', () => {
    const c = AMSparser.parseCompas('[CCCCC]');
    assert.strictEqual(c.numerador, 5);
    assert.strictEqual(c.denominador, 8);
    assert.deepStrictEqual(c.agrupacion, [1, 1, 1, 1, 1]);
});

test('parseCompas: "[CN]" deriva 3/8 (corchea + negra)', () => {
    const c = AMSparser.parseCompas('[CN]');
    assert.strictEqual(c.numerador, 3);
    assert.strictEqual(c.denominador, 8);
    assert.deepStrictEqual(c.agrupacion, [1, 2]);
});

test('parseCompas: dobles puntillos "[NPPN]" deriva 11/16 agrupado [7,4]', () => {
    const c = AMSparser.parseCompas('[NPPN]');
    assert.strictEqual(c.numerador, 11);
    assert.strictEqual(c.denominador, 16);
    assert.deepStrictEqual(c.agrupacion, [7, 4]);
});

test('parseCompas: fracción simple "[5/8]" no aporta agrupacion', () => {
    const c = AMSparser.parseCompas('[5/8]');
    assert.strictEqual(c.numerador, 5);
    assert.strictEqual(c.denominador, 8);
    assert.strictEqual(c.agrupacion, null);
});

test('parseCompas: fracción agrupada "[3+2/8]" y "[2+2/4]"', () => {
    const c = AMSparser.parseCompas('[3+2/8]');
    assert.strictEqual(c.numerador, 5);
    assert.strictEqual(c.denominador, 8);
    assert.deepStrictEqual(c.agrupacion, [3, 2]);
    const c2 = AMSparser.parseCompas('[2+2/4]');
    assert.deepStrictEqual(c2.agrupacion, [2, 2]);
});

test('validarCompas: acepta las tres formas y rechaza malformadas', () => {
    for (const t of ['[NNNN]', '[NP.N]', '[NPN]', '[CCCCC]', '[CN]', '[5/8]', '[3+2/8]', '[3+3+2/8]']){
        assert.strictEqual(AMSparser.validarCompas(t), true, t);
    }
    for (const t of ['[XYZ]', '[NN', '[]', '[+2/8]', '[3/5]', '[5//8]', '[.N]', '[P]', '[N..]', 'NNNN', 'N=120']){
        assert.strictEqual(AMSparser.validarCompas(t), false, t);
    }
});

test('el compás es metadata: no genera notas y se guarda en el parser', () => {
    const r = new AMSparser().parse('j1 n [NNNN] 4C 4E');
    assert.strictEqual(r.alturas.length, 2);
    assert.strictEqual(r.compas.numerador, 4);
});

test('la última firma de tiempo escrita gana', () => {
    const r = new AMSparser().parse('[NNNN] N=120 4C N [5/8]');
    assert.strictEqual(r.compas.texto, '[5/8]');
    assert.strictEqual(r.compas.denominador, 8);
});

test('un compás malformado lanza error del parser', () => {
    assert.throws(() => new AMSparser().parse('[XYZ] 4C N'), /no reconocida|inválido/i);
    assert.throws(() => new AMSparser().parse('[3/5] 4C N'), /denominador/i);
});

test('SecuenciaAsuar.desdeAMS conserva la firma de tiempo', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('j1 n [3+2/8] 4C 4D');
    assert.strictEqual(seq.getCompas().numerador, 5);
    assert.strictEqual(seq.getCompas().denominador, 8);
    assert.deepStrictEqual(seq.getCompas().agrupacion, [3, 2]);
});

test('ResaltadorAMS marca "[...]" válido como compas y los inválidos como error', () => {
    const r = new ResaltadorAMS();
    const segs = r.resaltar('j1 n [3+2/8] 4C [XYZ]');
    const compas = segs.find(s => s.tipo === 'compas');
    assert.ok(compas);
    assert.strictEqual(compas.texto, '[3+2/8]');
    const error = segs.find(s => s.tipo === 'error');
    assert.strictEqual(error.texto, '[XYZ]');
});

test('AsuarVexflow.compilar expone la firma de tiempo', () => {
    const seq = BancoDeSecuencias.secuenciaDesdeAMS('j1 n [3+2/8] 4C');
    const modelo = new AsuarVexflow(seq).compilar();
    assert.strictEqual(modelo.compas.numerador, 5);
    assert.strictEqual(modelo.compas.denominador, 8);
    assert.deepStrictEqual(modelo.compas.agrupacion, [3, 2]);
    assert.strictEqual(modelo.compas.texto, '[3+2/8]');
});
