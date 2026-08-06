# Un Emulador de un Sistema para hacer música con un microcomputador COMDASUAR

Librería JS que emula las características del COMDASUAR, computadora diseñada por José Vicente Asuar en 1978 y presentada en la Revista Musical Chilena Nº151 (1980). Dicho artículo es la base para desarrollar el código en JS que permite leer archivos de texto escritos con nomenclatura creada por Asuar para construir secuencias melódicas.

```
"Este instrumento, llamado Computador Musical Digital Analógico Asuar o COMDASUAR, está basado en el microprocesador 1NTEL 8080, Y tiene como prlnclpales rasgos musicales, el que puede reproducir cualquier partitura musical en forma automátíca, sin necesidad de una e¡ecución humana. También es polifónico (6 voces), absolutamente afinado y sincronizado, con elección libre de colores o timbre para cado voz. Además, el instrumento puede desarrollar programas heurísticos y proponer ideas musicales, basadas en probabilidades sonoras o en ¡uegos musicales.
Los datos musicales (partitura) se introducen en la memoria del computador por medio de un teclodo similar al de una m6quina de escribir y se proyectan en la pantalla de un televisor corriente para poder hacer los cambios y correcciones que se deseen. A raíz de la construccioo de este instrumento se edita, en 1979, un disco L.P. titulado 'Así habló el Computador', el que ilustra sus características y posibilidades."
```

# Implementación

Este proyecto puede ser utilizado como dependencia para otros proyectos de nodejs.
Para ello, el proyecto debe ser instalado como dependencia utilizando ssh o https en el package.json del proyecto que lo requiera.

El núcleo de la librería (`src/`) no depende de `fs` ni de ninguna API de Node, por lo que puede funcionar también en el navegador (ver más abajo). La lectura/escritura de archivos JSON se realiza a través del adaptador `Persistencia` (solo Node).

# Probando el proyecto (3 pasos)

```bash
npm test                # 1. tests unitarios (runner nativo node:test, sin dependencias)
npm run dev             # 2. servidor de desarrollo -> http://localhost:3000
npm run build             # 3. (solo tras tocar src/) regenerar el bundle (dist/comdasuar.js)
```

# Sintaxis Musical Asuar (AMS)
Cada tono se expresa por su altura y duración:

## 1. Altura
La altura se indica con tres datos:
Octava. Un número de O a 7. Es posible, por lo tanto, expresar 8 octavas.
Grado de la escala. Se expresa según la convención:

A=La
B=Si
C=Do
D=Re
E=Mi
F=Fa
G=Sol
A=La
B=Si
R = Silencio

### 1.1 Cromatismo
Se usa la convención:
S = Sostenido 
W = Bemol
Q = becuadro

Además, las alteraciones de cuarto de tono:
U = cuarto de tono ascendente
T = tres cuartos del tono ascendente
V = cuarto de tono descendente
R = tres cuartos de tono descendente

## 2. Duración
M = semifusa
F = fusa
S = semicorchea
C = corchea
N = negra
B = blanca
R = redonda
L = lunga
P = punto (multiplica por 1,5 el valor anterior)
Cualquier valor de duración se puede obtener por suma de los anteriores:

NP o NC = negra+corchea

## 3. Redundancia
Para simplificar y acelerar la introducción de datos, se aprovecha la gran cantidad de redundancia que contiene la información musical. Es así que se indica al computador sólo aquellos elementos que varían de un tono a otro. Si hay algún elemento de notación: octava, grado, cromatismo, duración, que se mantenga constante, no es necesario indicarlo, sino el computador le asigna el valor que tenía en el tono anterior. 

```
3C C
/ /
E /
/ /
G /
/ /
E N 
```

## 4. Modos
También se aprovecha la redundancia definiendo distintos modos de introducir los datos musicales:

### 4.1 Modo 0 (J0): 
Es el modo normal visto en los ejemplos anteriores. Para cada tono se indica su altura y duración.

### 4.2 Modo 1 (J1): 
Duración constante. Se indica al comienzo el valor de la duración común que tiene una serie de tonos.
A continuación se indica sólo la altura de cada tono. 

### 4.3 Modo 2 (J2): 
Altura constante. Se indica al comienzo el valor del tono que se repite, siguiendo una secuencia rítmica.
Después se indica el valor de cada duración. 

### 4.4 Modo 4 (J4): 
Reiteración. Este modo se utiliza cuando una sucesión de tonos se repite varias veces. Se indica primero el número de veces que se repite, y después, la sucesión de tonos, la que es delimitada por otro indicador de modo. 

### 4.5 Modo 5 (J5): 
Repite pásaje. Este modo inserta una lista de tonos que ya ha sido escrita en otra locación. Se indican los números del primero y último de los tonos del pasaje que se repetirá. 

# Ejemplo de uso

```javascript
// importamos la librería
const { EmuladorComdasuar } = require('comdasuar')

// instanciamos un objeto de la clase EmuladorComdasuar
const comdasuar = new EmuladorComdasuar()

// cargamos una partitura escrita en nomenclatura de Asuar (AMS)
comdasuar.nuevaPartituraAMS("j1 n 6b 3as 5e 4f 3ew d 5aw 4a g 6fs 4c")

// imprimimos la partitura compilada en consola
comdasuar.editSeq().print()
```

## Carga y guardado de bancos (JSON)

El constructor de `EmuladorComdasuar` acepta un texto JSON con los bancos (no una ruta de archivo):

```javascript
const comdasuar = new EmuladorComdasuar(textoJSON)   // carga bancos desde un texto JSON
```

Para leer/escribir archivos desde Node se usa el adaptador `Persistencia`:

```javascript
const Persistencia = require('comdasuar/src/Persistencia.js')

Persistencia.cargarAdmin(comdasuar.ADMIN, './bancos.json')   // carga desde archivo
Persistencia.guardarAdmin(comdasuar.ADMIN, './bancos.json')  // guarda en archivo
```

## Uso en navegador

Se incluye un bundle UMD único (`dist/comdasuar.js`) generado con Rollup desde los módulos de `src/`. Funciona tanto vía `<script>` como vía `require()` en Node:

```html
<script src="comdasuar.js"></script>
<script>
  const {EmuladorComdasuar} = window.comdasuar;
  const emu = new EmuladorComdasuar();
  emu.nuevaPartituraAMS("j1 n 6b 3as 5e 4f 3ew d 5aw 4a g 6fs 4c");
  console.log(emu.editSeq().getMidicents());
</script>
```

```javascript
const comdasuar = require('emuladorcomdasuar');
const seq = comdasuar.BancoDeSecuencias.secuenciaDesdeAMS('4C N 4E S');
```

El bundle expone en `window.comdasuar` (o como export del paquete) un único objeto con todas las clases públicas: `EmuladorComdasuar`, `AMSparser`, `BancoDeSecuencias`, `SecuenciaAsuar`, `NotaAsuar`, `Reproductor`, `MIDIexport`, `AdministradorDeBancos`, `Heuristicos`, `DiccionarioAsuar`, `getDiccionarioAsuar`, `Persistencia`, `ResaltadorAMS`, `AsuarVexflow`, `crearZip` y `crc32`. `Persistencia` usa `fs` (solo Node); en el navegador el bundle carga igual y solo falla si se invoca. Para regenerarlo tras cambios en `src/`:

```
npm run build
```

Puedes probar las propiedades básicas de la librería manualmente abriendo `test/manual.html` en un navegador (vía `npm run dev`, o con `file://` si el bundle está disponible junto al archivo).

Los logs de depuración internos de la librería están desactivados por defecto; actívalos con `EmuladorComdasuar.setDebug(true)`.

## Reproducción (WebAudio)

La clase `Reproductor` programa la secuencia como osciladores WebAudio (envolvente suave, silencios omitidos). Solo navegador:

```javascript
const { Reproductor } = window; // bundle navegador (también require('./src/Reproductor.js'))
const secuencia = BancoDeSecuencias.secuenciaDesdeAMS('4C N 4E S 4G C');
const reproductor = new Reproductor(secuencia, { volumen: 0.25, tipoOnda: 'sine' });
await reproductor.play();   // suena
await reproductor.stop();   // detiene
```

## Bancos como paleta de grupos × secuencias

Un `BancoDeSecuencias` es una **paleta**: cada secuencia pertenece a un **grupo** (columna), y los grupos son organizacionales (no pistas; el banco no es una línea de tiempo). Un banco nuevo tiene cero grupos; el primer `addSeq`/`addSeqAMS` crea y selecciona `grupo_A`.

```javascript
const { BancoDeSecuencias } = require('./src/BancoDeSecuencias.js');

const banco = new BancoDeSecuencias('Orquesta');
banco.addSeqAMS('j1 n 4c 4d 4e');              // -> grupo_A, "seq_1"
banco.addSeqAMS('j1 n 4f 4g 4a');              // -> grupo_A, "seq_2"

banco.nuevoGrupo();                            // -> grupo_B (seleccionado)
banco.setGrupoNombre(1, 'Cuerdas');
banco.addSeqAMS('j1 n 5c 5d');                 // -> grupo_B, "seq_1" (se numeran por grupo)

banco.selSeqGrupo(0, 1);                       // selecciona (grupo 0, fila 1)
banco.editSeqGrupo(1, 0);                      // edita por coordenadas
banco.getSeqG(0, 0);                           // secuencia por coordenadas
banco.getGrupos();                             // [{nombre, size, indice}]
banco.flatten();                               // todas las secuencias en orden
banco.deleteGrupo(1);
```

Los nombres por defecto son `grupo_A`, `grupo_B`, … (próxima letra no usada) y `seq_1`, `seq_2`, … (base 1, **por grupo**). `cargarBanco` acepta el formato nuevo `{grupos: [{nombre, secuencias: [...]}]}` y el formato legacy `{secuencias: [...]}` (se envuelve en un solo `grupo_A`).

## Firma de tiempo `[...]` (metadata)

La partitura AMS puede llevar una firma de tiempo entre corchetes, en cualquiera de estas tres formas:

```text
[NNNN]       figuras: se suma la duración de cada figura
[NP.N]       con puntillo y punto de grupo (equivale a [NPN]): 5/8 agrupado 3+2
[5/8]        fracción simple
[3+2/8]      fracción agrupada (las partes suman el numerador)
```

El compás es solo **metadata** (no genera notas ni afecta la reproducción); puede aparecer en cualquier lugar del texto y **la última escrita gana**. Se obtiene con `AMSparser.parseCompas(token)` o `SecuenciaAsuar.getCompas()`:

```javascript
const seq = BancoDeSecuencias.secuenciaDesdeAMS('j1 n [3+2/8] 4c 4d');
seq.getCompas();   // {texto:'[3+2/8]', numerador:5, denominador:8, agrupacion:[3,2]}
```

`parseCompas` deriva `numerador`/`denominador` tomando `denominador = 4 × subdivisión` (la figura base es la negra, `N = 1`), así `[NP.N]` → 5/8 y `[NNNN]` → 4/4. `AMSparser.validarCompas(token)` valida sin lanzar. El `ResaltadorAMS` colorea los tokens `[...]` válidos como `compas` (amarillo) y los inválidos como `error`.

## Provenance y restauración de secuencias

Cada `SecuenciaAsuar` lleva un historial de las transformaciones heurísticas aplicadas. Todos los procesos de `Heuristicos` lo registran (`registrarTransformacion`), y `restaurarOriginal()` recompila el `codigoAMS` original (notas, tempo y firma de tiempo), conservando el nombre y el índice:

```javascript
const seq = BancoDeSecuencias.secuenciaDesdeAMS('j1 n 4c 4d 4e');
Heuristicos.transportar(seq, 200);
seq.estaTransformada();      // true
seq.getTransformaciones();   // [{op:'transportar', params:[200]}]
seq.restaurarOriginal();     // true (revierte y borra el historial)
```

En la fachada: `comdasuar.restaurarSeq()` restaura la secuencia seleccionada. El historial sobrevive a los round-trips JSON.

## Exportación MIDI

`MIDIexport` convierte un banco (o una secuencia) a un `Uint8Array` con un archivo SMF **formato 1**: la pista 0 lleva el tempo y cada `SecuenciaAsuar` ocupa una pista propia (PPQ 480, sin running status). Como el banco es una paleta (no una línea de tiempo), **cada pista emite su propio tempo meta (FF 51 03) en el tick 0**, usando el tempo de su secuencia. Los silencios generan pausas y los cuartos de tono se redondean al semitono más cercano.

En Node (guardar en disco):

```javascript
const { BancoDeSecuencias, MIDIexport } = require('./src/BancoDeSecuencias.js');
const Persistencia = require('./src/Persistencia.js');

const banco = new BancoDeSecuencias();
banco.addSeqAMS('4C N 4E S');
banco.addSeqAMS('5A B 3G C');
const bytes = MIDIexport.bancos2mid(banco);
Persistencia.guardarMIDI(bytes, './banco.mid');
```

En el navegador (descargar el archivo):

```javascript
MIDIexport.descargar(bytes, 'banco.mid');
```

### ZIP con un `.mid` por secuencia

`MIDIexport.bancos2zip(banco)` empaqueta cada secuencia como su propio archivo SMF y los comprime en un ZIP (entradas sin comprimir, compatibles con cualquier descompresor). Cada entrada se llama con la etiqueta **`<secuencia> - <grupo>.mid`** (p. ej. `seq_1 - grupo_A.mid`), construida por `MIDIexport.etiquetaSecuenciaGrupo(seq, grupo)`:

```javascript
const { BancoDeSecuencias, MIDIexport } = require('./src/BancoDeSecuencias.js');
const Persistencia = require('./src/Persistencia.js');

const banco = new BancoDeSecuencias();
banco.addSeqAMS('4C N 4E S');
banco.getSeq(0).setNombre('La escala');
banco.addSeqAMS('5A B 3G C');

// Node: guarda un ZIP con "La escala - grupo_A.mid" y "seq_2 - grupo_A.mid"
Persistencia.guardarZIP(MIDIexport.bancos2zip(banco), './bancos.zip');

// Navegador: descarga el ZIP
MIDIexport.descargar(MIDIexport.bancos2zip(banco), 'bancos.zip');
```

Los nombres se sanean para los nombres de archivo (se quitan `/\:*?"<>|` y caracteres de control, se colapsan espacios y se recortan los puntos iniciales y finales). La etiqueta legacy `MIDIexport.etiquetaSecuencia(banco, i)` (`<nombreBanco>_<nombreSecuencia>` o `<indiceBanco>_<i>`) se conserva solo para bancos legacy con lista plana `secuencias`.

### Resaltado de sintaxis AMS (`ResaltadorAMS`)

`src/gui/ResaltadorAMS.js` es un **resaltador de sintaxis** (una clase de visualización, independiente del parser): recorre el código Asuar y devuelve segmentos clasificados para colorearlo, siguiendo exactamente el mismo estado que `AMSparser.compilar()` (modos `J0`/`J1`/`J2`, argumentos de los comandos, cambios de tempo y operador `/`). El alfabeto (notas, alteraciones, figuras, octavas, subdivisones) se toma de `getDiccionarioAsuar()` para no duplicarlo.

```javascript
const { ResaltadorAMS } = require('./src/gui/ResaltadorAMS.js');

const resaltador = new ResaltadorAMS();
const segmentos = resaltador.resaltar('J0 4C r 4D r');   // [{tipo, texto}...]
// [{tipo:'modo', texto:'J0'}, {tipo:'texto', texto:' '},
//  {tipo:'altura', texto:'4C'}, {tipo:'texto', texto:' '},
//  {tipo:'duracion', texto:'r'}, {tipo:'texto', texto:' '}, ...]
```

Los segmentos son contiguos y reconstruyen el texto original exactamente (incluyendo mayúsculas y espacios), así que se puede superponer un `<pre>` coloreado bajo un `<textarea>` transparente para editar con resaltado en vivo. Los tipos son:

| Tipo          | Color (en `test/manual.html`) | Significado                                        |
|---------------|-------------------------------|----------------------------------------------------|
| `modo`        | púrpura                       | comandos `J..` y sus argumentos                    |
| `tempo`       | amarillo                      | cambio de tempo (`N=60`, `B=90.5`)                |
| `compas`      | amarillo                      | firma de tiempo (`[NNNN]`, `[5/8]`, `[3+2/8]`)    |
| `altura`      | verde                         | altura, silencio o acorde en posición de altura    |
| `duracion`    | azul                          | figura, grupo o puntillo en posición de duración   |
| `repetir`     | neutro                        | el operador `/` (repite la altura/duración previa) |
| `error`       | rojo (subrayado ondulado)     | palabra que no encaja en su posición               |
| `texto`       | sin color                     | espacios y saltos de línea                         |

En el modo `J0` el resaltador alterna posición de altura y duración (como el parser, que lee pares altura-duración); con `J1` (duración constante) solo hay alturas, y con `J2` (altura constante) solo duraciones. Los métodos públicos `esAltura(texto)`, `esDuracion(texto)` y `esRest(texto)` permiten validar una palabra suelta.

### Partitura de piano (grand staff) con VexFlow (`AsuarVexflow`)

`src/gui/AsuarVexflow.js` es una clase de **conversión pura** (no importa VexFlow ni el DOM): transforma una `SecuenciaAsuar` en un árbol de descriptores listo para pintar con VexFlow en un pentagrama doble (clave de sol y de fa, unidos por llave), dividido en el Do central (Do4): `midicent >= 6000` va al pentagrama superior (`agudos`), el resto al inferior (`graves`). Un acorde puede partirse entre ambos pentagramas.

```javascript
const { BancoDeSecuencias } = require('./src/BancoDeSecuencias.js');
const { AsuarVexflow } = require('./src/gui/AsuarVexflow.js');

const seq = BancoDeSecuencias.secuenciaDesdeAMS('J2 3N 4C 5E');
const vf = new AsuarVexflow(seq);
const arbol = vf.compilar();
// arbol = { pentagramas: { agudos: {notas, figuras}, graves: {notas, figuras} },
//           compases: [], caption: '...', clave: '4', tempoInicial: null, npp: 4 }
```

Cada nota del árbol trae su `midicent`, `altura` (nombre de nota VexFlow, p. ej. `'C/4'`), `octava`, `alteracion`, `figura`, `silencio`, `ligada` y `tuplet`. La figura es una duración VexFlow (`"4"`, `"8d"`, …); los grupos irregulares de `3`, `5` o `7` figuras se agrupan en un `Tuplet` (campo `tuplet` con el número de notas, `null` si no aplica) y las duraciones que no caben en una sola figura se encadenan con ligaduras de prolongación (`ligada: true`). Métodos públicos: `compilar()`, `claveDeMidicent(mc, preferBemol)`, `claveDeAltura()`, `duracionVexflow()`, `_redondear()`, `_figuraMasCercana()`, `_descriptor()` y `_expandirCeros()`.

La página `test/manual.html` incluye un panel **"6. Partitura VexFlow"** que pinta este árbol con VexFlow 4 (cargado **bajo demanda** desde la CDN `https://cdn.jsdelivr.net/npm/vexflow@4/build/cjs/vexflow.js` con el botón "Cargar VexFlow", para no bloquear la carga de la página; si no está disponible muestra "(VexFlow no cargado)") y permite redibujar, descargar PNG y SVG, e imprimir. En la partitura la secuencia completa ocupa un único compás (los compases se reservan para un futuro indicador de compás), la leyenda es `nombre — N=notas (figura=pulsosPorMin)` y las notas alteradas con `W` en AMS se escriben con bemoles; los cuartos de tono (U/V/T/R) se redondean al semitono más cercano.

> Nota: el panel de partitura necesita conexión (o un `vexflow.js` servido localmente junto al bundle); sin VexFlow el resto de la página funciona igual.

### Edición de secuencias y bancos (métodos)

Además de parsear y reproducir, la librería permite editar la estructura de bancos y secuencias (funciona igual en Node y en el navegador):

| Método                        | Descripción                                                        |
|-------------------------------|--------------------------------------------------------------------|
| `SecuenciaAsuar.clone()`      | Copia profunda e independiente de la secuencia                     |
| `banco.deleteSeq(indice)`     | Elimina la secuencia y reindexa las restantes                      |
| `banco.duplicarSeq(indice)`   | Duplica la secuencia y la agrega al final del banco                |
| `admin.deleteBanco(indice)`   | Elimina el banco y reindexa (crea uno vacío si no queda ninguno)   |
| `emulador.eliminarSeq()`      | Elimina la secuencia seleccionada (fachada)                        |
| `emulador.duplicarSeq()`      | Duplica la secuencia seleccionada (fachada)                        |
| `emulador.eliminarBanco()`    | Elimina el banco seleccionado (fachada)                            |

## Desarrollo

### Requisitos

- **Node.js >= 18** (el runner de tests usa `node:test`, incluido en el runtime).
- El proyecto **no tiene dependencias**: no hace falta `npm install`.
- No hay linter ni typecheck configurados; la verificación es `npm test` + revisión manual.

### 1. Tests unitarios

Suite con el runner nativo `node:test`, sin dependencias externas:

```bash
npm test                # ejecuta todos los suites de test/unit/
npm run test:watch      # vuelve a correr los tests en cada cambio
node --test test/unit/midi.test.js     # una suite en particular
```

Cobertura por archivo (`test/unit/`):

| Archivo                   | Qué prueba                                                                |
|---------------------------|---------------------------------------------------------------------------|
| `diccionario.test.js`     | Ritmos, duraciones (puntillos, grupos irregulares), alturas y alteraciones |
| `amsparser.test.js`       | Parser AMS: modos J0-J5, redundancias, barras `/`, cambios de tempo, fixtures |
| `secuencia.test.js`       | Notas, midicents, duraciones, inicios, tempo, formatos Bach                |
| `banco.test.js`           | `addSeq`/`addSeqAMS`/`setSeq`/`selSeq`, pipeline `secuenciaDesdeAMS`       |
| `persistencia.test.js`    | Round-trip JSON, `cargarAdmin`/`guardarAdmin`, `guardarMIDI` (disco)       |
| `heuristicos.test.js`     | Transportar, invertir, retrogradar, expandir, desordenar, transmutar       |
| `midi.test.js`            | Salida SMF byte a byte: cabecera, tempo meta, ticks, silencios, PPQ 480    |
| `zip.test.js`             | CRC-32, estructura ZIP, `bancos2zip` (un `.mid` por secuencia), `guardarZIP` |
| `resaltador.test.js`      | `ResaltadorAMS`: segmentos, modos J0-J2, tempo, `/`, errores, `esAltura`/`esDuracion` |
| `asuarvexflow.test.js`    | `AsuarVexflow`: claves, figuras/puntillos/ligaduras, grupos 3/5/7, división agudos/graves, silencios |
| `edicion.test.js`         | `clone`, `deleteSeq`/`duplicarSeq`, `deleteBanco`, métodos de fachada      |
| `grupos.test.js`          | Paleta de grupos: nombres por defecto, nuevo/eliminar/renombrar, coordenadas, JSON `{grupos}`/legacy, ZIP/MIDI con grupos, tempo propio por pista |
| `compas.test.js`          | Firma de tiempo: figuras/fracción/fracción agrupada, derivación LCD, validez, resaltado y modelo VexFlow |
| `restaurar.test.js`       | Provenance: registro de transformaciones, `restaurarOriginal`, round-trip JSON |
| `reproductor.test.js`     | `midicent2hz`, comportamiento en Node (sin AudioContext)                   |

### 2. Prueba manual en el navegador

```bash
npm run dev        # http://localhost:3000  (PORT=xxxx para otro puerto)
```

Abrir `http://localhost:3000` y probar `test/manual.html`:

1. **Partituras de ejemplo** — elige una del menú y pulsa "Cargar en editor" (llena el textarea con su AMS).
2. **Compilar** — pulsa "Agregar secuencia" (la agrega al banco) o "Reemplazar secuencia actual".
3. **Reproducir** — pulsa ▶ Reproducir (WebAudio) / ■ Detener. Puedes cambiar tipo de onda y volumen.
4. **Paleta de grupos** — el panel "2.5" muestra el banco como tabla de grupos (columnas) × secuencias (filas); clic en una celda selecciona esa secuencia. Puedes crear/renombrar/eliminar grupos.
5. **Editar el banco** — cada secuencia se identifica con su etiqueta `banco_grupo_fila` (`0_0_0`, `0_0_1`, …). Puedes renombrar/duplicar la secuencia seleccionada, **"Restaurar original"** (revierte las transformaciones), y eliminar secuencia/banco.
6. **Heurísticos** — aplica transportar, invertir, retrogradar, expandir o transmutar sobre la secuencia seleccionada (los orígenes de transmutación se listan por grupo).
7. **Exportar** — "Descargar ZIP (1 .mid por secuencia)" baja un ZIP con un archivo `<secuencia> - <grupo>.mid` por secuencia; "Descargar MIDI (banco, formato 1)" genera el SMF multi-pista con tempo propio por pista; también hay **exportar/importar bancos a JSON**.
8. **Partitura VexFlow** — VexFlow se carga **bajo demanda** ("Cargar VexFlow", desde la CDN) y no bloquea la carga de la página; "Redibujar" repinta, "PNG"/"SVG" descargan la imagen y "Imprimir" imprime solo la partitura.

> Nota: `test/manual.html` también funciona abriéndolo con `file://`, pero el menú de partituras de ejemplo se oculta (requiere el servidor). El audio WebAudio necesita un gesto del usuario (clic en Reproducir).

### 3. API con curl

| Método | Ruta                          | Descripción                                  |
|--------|-------------------------------|----------------------------------------------|
| GET    | `/api/scores`                 | Lista de partituras de `test/scores/`        |
| GET    | `/api/scores/:nombre`         | Contenido (AMS) de la partitura              |
| GET    | `/api/scores/:nombre/midi`    | Archivo `.mid` de esa partitura              |
| POST   | `/api/sequence`               | `{ ams }` → datos de la secuencia compilada  |
| POST   | `/api/heuristic`              | `{ ams, op, params, amsB? }` → secuencia transformada |

```bash
curl http://localhost:3000/api/scores
curl http://localhost:3000/api/scores/ej6.txt
curl -X POST http://localhost:3000/api/sequence \
     -H 'Content-Type: application/json' \
     -d '{"ams":"4C N 4E S"}'
curl -X POST http://localhost:3000/api/heuristic \
     -H 'Content-Type: application/json' \
     -d '{"ams":"4C N 4E N","op":"transportar","params":[100]}'
```

Operaciones de `/api/heuristic`: `transportar`, `invertir`, `retrogradarAlturas`, `retrogradarDuraciones`, `desordenarAlturas`, `desordenarDuraciones`, `expandirAlturas`, `expandirDuraciones`, `transmutarAlturas` y `transmutarDuraciones` (las dos últimas reciben la partitura B en `amsB`).

### 4. Verificar la salida MIDI

Con el servidor levantado, descarga una partitura como `.mid` y comprueba su estructura:

```bash
curl -o prueba.mid http://localhost:3000/api/scores/ej6.txt/midi
file prueba.mid
xxd -l 14 prueba.mid     # MThd 00000006 | 0001 (formato 1) | 0002 (2 pistas) | 01E0 (PPQ 480)
```

Esperado: cabecera `MThd`, longitud `00 00 00 06`, formato `00 01`, y división `01 E0` (480 ticks por negra). Para escucharlo, abre `prueba.mid` en un DAW, VLC o el reproductor MIDI de tu sistema. También puedes generar un MIDI desde Node:

```bash
node -e "
  const {BancoDeSecuencias} = require('./src/BancoDeSecuencias.js');
  const {MIDIexport} = require('./src/MIDIexport.js');
  const Persistencia = require('./src/Persistencia.js');
  const banco = new BancoDeSecuencias();
  banco.addSeqAMS('4C N 4E S');
  banco.addSeqAMS('5A B 3G C');
  Persistencia.guardarMIDI(MIDIexport.bancos2mid(banco), './banco.mid');
"
```

Para el ZIP con un `.mid` por secuencia, añade la etiqueta del banco y verifica el contenido con `unzip`:

```bash
node -e "
  const {BancoDeSecuencias} = require('./src/BancoDeSecuencias.js');
  const {MIDIexport} = require('./src/MIDIexport.js');
  const Persistencia = require('./src/Persistencia.js');
  const banco = new BancoDeSecuencias();
  banco.setIndice(1);
  banco.addSeqAMS('4C N 4E S');
  banco.addSeqAMS('5A B 3G C');
  Persistencia.guardarZIP(MIDIexport.bancos2zip(banco), './bancos.zip');
"
unzip -l bancos.zip        # debe listar 1_0.mid y 1_1.mid
unzip -p bancos.zip 1_0.mid | xxd -l 14   # cada entrada es un SMF válido (MThd...)
```

### 5. Bundle del navegador

El archivo `dist/comdasuar.js` (y su versión minificada `dist/comdasuar.min.js`) se genera con Rollup (UMD) desde el punto de entrada `src/index.js`. Regenerarlo tras cambios en `src/`:

```bash
npm run build
```

Usar la librería desde el sitio desplegado con `<script>` (bundle UMD, expone el global `comdasuar`):

```html
<script src="https://delaefe.site/dev/ecomdasuar/comdasuar.js"></script>
<script>
  const {EmuladorComdasuar, Reproductor, MIDIexport} = window.comdasuar;
  const comdasuar = new EmuladorComdasuar();
</script>
```

- Dev: `https://delaefe.site/dev/ecomdasuar/comdasuar.js`
- Producción (rama `master`): `https://delaefe.site/ecomdasuar/comdasuar.js`
- Minificados: `comdasuar.min.js` en cada ruta

### 6. Deploy (entorno dev)

El workflow `.github/workflows/dev.yml` compila y despliega el sitio estático (`test/manual.html` + bundle + `scores/` + `src/`) por FTP al entorno `public_html/dev/ecomdasuar`. Se ejecuta al hacer push a `main` o `dev`, o manualmente desde la pestaña **Actions** ("Run workflow"), lo que permite probar el entorno de despliegue sin tocar producción. Requiere los secrets `FTPUSERNAME` y `FTPPASSWORD`.

### Solución de problemas

| Problema                                   | Causa / solución                                                            |
|--------------------------------------------|-----------------------------------------------------------------------------|
| `EADDRINUSE` al levantar el servidor       | Puerto ocupado: usa `PORT=3001 npm run dev`                                  |
| El navegador no refleja cambios de `src/`  | Bundle desactualizado: `npm run build` y recargar la página                  |
| No hay audio al pulsar Reproducir          | WebAudio requiere un gesto del usuario; comprueba que no esté en pestaña silenciada |
| Los silencios (R) no suenan                | Comportamiento esperado: ocupan tiempo pero no emiten tono                   |
| El menú de partituras de ejemplo no aparece| Estás usando `file://`; abre la página a través de `npm run dev`              |

## Nomenclatura Asuar

Cada todo se expresa por su altura y duración
### Alturas
A = La
B = Si
C = Do
D = Re
E = Mi
F = Fa
G = Sol
R = Silencio

S = Sostenido
W = Bemol
Q = Becuadro

#### Acordes y desplazamientos de octava

- `<` y `>` bajan/suben una octava relativa a la última octava explícita; `<<` y `>>` dos. Afectan solo a la altura que acompañan (no cambian la octava heredada por las siguientes). El resultado se limita a las octavas 1–8.
- Un acorde agrupa varias alturas separadas por `.` (los separadores son opcionales): `4C.E.G.>C` ≡ `4CEG>C` ≡ `4CEG5C`. Las alturas sin octava explícita heredan la última conocida dentro del acorde, y el acorde actualiza la octava global solo desde su primera altura explícita.
- `R` es contextual: sola (`R`) = silencio; en posición de duración (`R`) = redonda (4000 ms); tras una nota (ej. `4CR`) = alteración de +3/4 de tono (+150 midicent, igual que `T`). Cualquier otro uso de `R` (tras una octava, como nota dentro de un acorde, o como segunda alteración) es un error de sintaxis.
- Los acordes se tratan como bloques atómicos en `retrogradarAlturas` y `desordenarAlturas`; con las demás heurísticas (`transportar`, `invertir`, `expandirAlturas`, `transmutarAlturas`) se transforman todas sus alturas.

### Duraciones
M = Semifusa
F = Fusa
S = Semicorchea
C = Corchea
N = Negra
B = Blanca
R = Redonda
L = Lunga
P = punto (multiplica por 1.5 el valor anteior)

Cualqueir valor de duracion se puede obtener por la suma de valores anteriores
Ej.: "BCM" es blanca+corchea+semifusa, una negra con punto seria "NP" o "NC".

Anteponer un número 3 convierte la siguente duración en tresillo, 5 en quintillo y 7 en septilo. 0 para una duración normal.

### Ejemplo de partitura

```
5BW 0NF // Si bemol 5, negra ligada a una fusa
3BQ 3C // Si natural 3, corchea de tresillo
R 0S // silencio de semicorchea
6E C // Mi 6, corchea
2DU 7B // Re +1/4 de tono 2, sietesillo de blanca
```

### Modos

#### Modo 0
Es el modo nomral de los ejemplos anteriores. Para cada sonido se indica altura y duracion

#### Modo 1: Duración constante
Se indica el comiendo el valor de la duración que se mantendrá consatnte, luego una serie de tonos.
```
J1 3S // tresillo de semicorchea
3C // do 3, tresillo de semicorchea
D // re, tresillo de semicorchea
E // mi, tresillo de semicorchea
F // fa, tresillo de semicorchea
G 
4A
B
C
D
J0 // modo 0 (nota duracion)
E 0B // Mi 5, blanca
```

#### Modo 2: Altura constante
Se indica el valor del tono 

```
J2 4C // altura constante: do 4
CP // corchea con punto
 // (se repite)
S // Semicorchea
NS // negra + semicorchea
S // semicorchea
3 // tresillo de semicorchea
 // (se repite)
 // (se repite)
0C // corchea
5 // quintillo de corchea
7 // sietecillo de corchea
J0 // cambio a modo 0 (nota duracion)
3G 0B // Sol 3, blanca
```

#### Modo 4 Reiteración
Este modo se utiliza cuando una sucesión de tonos se repite varias veces. Se indica primero el numero de veces que se repite, y después la sucesión de tonos, la que es delimitada por otro indicador de modo. Este modo sirve especialmente para obtener trinos, trémolos, etc. 

```
J4 S
J4 4
2C
E
J1 S
G
3C
```

##### Modo 5: Repite pasaje
Este modo inserta una lista de tonos que ya ha sido escrita en otra locación. Se indican los números del primero y último de los tonos del pasaje que se repetirá. 
```
3C N
J1 C
E
G
4C
B
A
B
JO
C B
3G / // el / indica repetir duracion anterior
J5 1 7
4C R
```

# Contacto

Diego de la Fuente Curaqueo diego.delafuente [at] ug.uchile.cl

2019 - 2023

