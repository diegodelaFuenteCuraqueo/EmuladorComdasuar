# Un Emulador de un Sistema para hacer música con un microcomputador COMDASUAR

Librería JS que emula las características del COMDASUAR, computadora diseñada por José Vicente Asuar en 1978 y presentada en la Revista Musical Chilena Nº151 (1980). Dicho artículo es la base para desarrollar el código en JS que permite leer archivos de texto escritos con nomenclatura creada por Asuar para construir secuencias melódicas.

# Implementación

Este proyecto puede ser utilizado como dependencia para otros proyectos de nodejs.
Para ello, el proyecto debe ser instalado como dependencia utilizando ssh o https en el package.json del proyecto que lo requiera.

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

# Contacto

Diego de la Fuente Curaqueo diego.delafuente [at] ug.uchile.cl

2019 - 2023

