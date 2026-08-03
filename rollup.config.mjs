/* Configuración de Rollup: empaqueta la librería (CommonJS en src/) en un
 * único archivo UMD usable vía <script> (global `comdasuar`) y vía require().
 *
 *   npm run build   ->  dist/comdasuar.js      (legible)
 *                       dist/comdasuar.min.js  (minificado)
 *
 * `fs` (solo usado por Persistencia, Node.js) queda externo: en navegador el
 * bundle carga igualmente y Persistencia solo falla si se invoca. */

import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const ENTRADA = 'src/index.js';
const externo = ['fs'];

export default [
    {
        input: ENTRADA,
        output: {
            file: 'dist/comdasuar.js',
            format: 'umd',
            name: 'comdasuar',
            exports: 'default',
            globals: {fs: 'fs'},
        },
        external: externo,
        plugins: [commonjs()],
    },
    {
        input: ENTRADA,
        output: {
            file: 'dist/comdasuar.min.js',
            format: 'umd',
            name: 'comdasuar',
            exports: 'default',
            globals: {fs: 'fs'},
        },
        external: externo,
        plugins: [commonjs(), terser()],
    },
];
