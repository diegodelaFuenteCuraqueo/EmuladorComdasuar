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

El bundle expone en `window` las clases `EmuladorComdasuar`, `AMSparser`, `BancoDeSecuencias`, `SecuenciaAsuar`, `NotaAsuar` y `DiccionarioAsuar`. Para regenerarlo tras cambios en `src/`:

```
npm run build:browser
```

Puedes probar las propiedades básicas de la librería manualmente abriendo `test/manual.html` en un navegador.

Los logs de depuración internos de la librería están desactivados por defecto; actívalos con `EmuladorComdasuar.setDebug(true)`.

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

