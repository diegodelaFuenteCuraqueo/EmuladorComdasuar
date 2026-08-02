/*================================================================================+
| EMULADOR COMDASUAR (2018-2021)                                                  |
|· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·|
| Desarrollado por Diego de la Fuente Curaqueo                                    |
| como parte del proyecto de recodificación del COMDASUAR original                |
| creado por José Vicente Asuar durante los años 70'.                             |
+=================================================================================*/

/* Genera un bundle único (para <script>) a partir de los módulos CommonJS en src/.
 * No usa ningún empaquetador externo: envuelve cada módulo en una función con un
 * mini-resolvedor de require. Ejecutar:  node tools/build-browser.js
 * El archivo resultante es test/comdasuar.browser.js (usado por test/manual.html). */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const OUT = path.join(__dirname, '..', 'test', 'comdasuar.browser.js');

const MODULOS = [
    'util.js',
    'diccionarioAsuar.js',
    'NotaAsuar.js',
    'SecuenciaAsuar.js',
    'AMSparser.js',
    'Heuristicos.js',
    'BancoDeSecuencias.js',
    'AdministradorDeBancos.js',
    'EmuladorComdasuar.js',
];

const EXPORTADOS = {
    'EmuladorComdasuar.js': 'EmuladorComdasuar',
    'AMSparser.js': 'AMSparser',
    'BancoDeSecuencias.js': 'BancoDeSecuencias',
    'SecuenciaAsuar.js': 'SecuenciaAsuar',
    'NotaAsuar.js': 'NotaAsuar',
    'DiccionarioAsuar': 'DiccionarioAsuar',
};

const header = `/* Bundle generado automáticamente para navegador (NO EDITAR).
 * Se genera con: node tools/build-browser.js
 * Fuente: módulos CommonJS en src/. */
(function(){
"use strict";
var __modules = {};
var __cache = {};
function __require(id){
  if(__cache[id]) return __cache[id].exports;
  var m = { exports: {} };
  __cache[id] = m;
  __modules[id](m, m.exports, __require);
  return m.exports;
}

`;

let body = '';
for (const nombre of MODULOS){
    // los módulos usan `exports.X`/`module.exports`, que funcionan tal cual dentro
    // de la función-wrapper (exports y module son parámetros del mini-resolvedor).
    const src = fs.readFileSync(path.join(SRC, nombre), 'utf8');
    body += `__modules['./${nombre}'] = function(module, exports, __require){\nvar require = __require;\n${src}\n};\n\n`;
}

let footer = '\n';
for (const [nombre, exportado] of Object.entries(EXPORTADOS)){
    if (nombre === 'DiccionarioAsuar'){
        footer += `window.${exportado} = __require('./diccionarioAsuar.js').${exportado};\n`;
    } else {
        footer += `window.${exportado} = __require('./${nombre}').${exportado};\n`;
    }
}
footer += '})();\n';

fs.writeFileSync(OUT, header + body + footer);
console.log('Bundle generado en ' + OUT);
