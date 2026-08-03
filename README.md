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
npm run build:browser   # 3. (solo tras tocar src/) regenerar el bundle del navegador
```

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

Se incluye un bundle para `<script>` generado desde los módulos de `src/`:

```html
<script src="test/comdasuar.browser.js"></script>
<script>
  const comdasuar = new EmuladorComdasuar();
  comdasuar.nuevaPartituraAMS("j1 n 6b 3as 5e 4f 3ew d 5aw 4a g 6fs 4c");
  console.log(comdasuar.editSeq().getMidicents());
</script>
```

El bundle expone en `window` las clases `EmuladorComdasuar`, `AMSparser`, `BancoDeSecuencias`, `SecuenciaAsuar`, `NotaAsuar`, `Reproductor`, `MIDIexport` y `DiccionarioAsuar`. Para regenerarlo tras cambios en `src/`:

```
npm run build:browser
```

Puedes probar las propiedades básicas de la librería manualmente abriendo `test/manual.html` en un navegador.

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

## Exportación MIDI

`MIDIexport` convierte un banco (o una secuencia) a un `Uint8Array` con un archivo SMF **formato 1**: la pista 0 lleva el tempo y cada `SecuenciaAsuar` ocupa una pista propia (PPQ 480, sin running status). Los silencios generan pausas y los cuartos de tono se redondean al semitono más cercano.

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

`MIDIexport.bancos2zip(banco)` empaqueta cada secuencia como su propio archivo SMF y los comprime en un ZIP (entradas sin comprimir, compatibles con cualquier descompresor). Cada archivo se llama con la etiqueta `banco_secuencia` (p. ej. `0_0.mid`, `0_1.mid`):

```javascript
const { BancoDeSecuencias, MIDIexport } = require('./src/BancoDeSecuencias.js');
const Persistencia = require('./src/Persistencia.js');

const banco = new BancoDeSecuencias();
banco.setIndice(2);
banco.addSeqAMS('4C N 4E S');
banco.addSeqAMS('5A B 3G C');

// Node: guarda un ZIP con 2_0.mid y 2_1.mid
Persistencia.guardarZIP(MIDIexport.bancos2zip(banco), './bancos.zip');

// Navegador: descarga el ZIP
MIDIexport.descargar(MIDIexport.bancos2zip(banco), 'bancos.zip');
```

La etiqueta se obtiene con `MIDIexport.etiquetaSecuencia(banco, i)` y no depende del nombre de la secuencia: es siempre `{indiceBanco}_{indiceSecuencia}`.

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
| `edicion.test.js`         | `clone`, `deleteSeq`/`duplicarSeq`, `deleteBanco`, métodos de fachada      |
| `reproductor.test.js`     | `midicent2hz`, comportamiento en Node (sin AudioContext)                   |

### 2. Prueba manual en el navegador

```bash
npm run dev        # http://localhost:3000  (PORT=xxxx para otro puerto)
```

Abrir `http://localhost:3000` y probar `test/manual.html`:

1. **Partituras de ejemplo** — elige una del menú y pulsa "Cargar en editor" (llena el textarea con su AMS).
2. **Compilar** — pulsa "Agregar secuencia" (la agrega al banco) o "Reemplazar secuencia actual".
3. **Reproducir** — pulsa ▶ Reproducir (WebAudio) / ■ Detener. Puedes cambiar tipo de onda y volumen.
4. **Editar el banco** — cada secuencia se identifica con su etiqueta `banco_secuencia` (`0_0`, `0_1`, …). Puedes renombrar/duplicar/eliminar la secuencia seleccionada, y renombrar/eliminar el banco.
5. **Heurísticos** — aplica transportar, invertir, retrogradar, expandir o transmutar sobre la secuencia seleccionada.
6. **Exportar MIDI** — "Descargar ZIP (1 .mid por secuencia)" baja un ZIP con un archivo `banco_secuencia.mid` por secuencia; "Descargar MIDI (banco, formato 1)" genera el SMF multi-pista del banco completo.

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

El archivo `test/comdasuar.browser.js` se genera desde los módulos de `src/` con un mini-empaquetador (sin bundlers externos). Regenerarlo tras cambios en `src/`:

```bash
npm run build:browser
```

### 6. Deploy (entorno dev)

El workflow `.github/workflows/dev.yml` compila y despliega el sitio estático (`test/manual.html` + bundle + `scores/` + `src/`) por FTP al entorno `public_html/dev/ecomdasuar`. Se ejecuta al hacer push a `main` o `dev`, o manualmente desde la pestaña **Actions** ("Run workflow"), lo que permite probar el entorno de despliegue sin tocar producción. Requiere los secrets `FTPUSERNAME` y `FTPPASSWORD`.

### Solución de problemas

| Problema                                   | Causa / solución                                                            |
|--------------------------------------------|-----------------------------------------------------------------------------|
| `EADDRINUSE` al levantar el servidor       | Puerto ocupado: usa `PORT=3001 npm run dev`                                  |
| El navegador no refleja cambios de `src/`  | Bundle desactualizado: `npm run build:browser` y recargar la página          |
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

