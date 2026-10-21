# Tendencias exploratorias y cuotas manuales

## Uso

En **Tendencias**, elige estadística, equipo, jugador o partido próximo. También puedes abrir un encuentro en el calendario y pulsar **Ver tendencias de este partido**. En modo real, la asociación con los próximos equipos procede de las plantillas personales revisadas, nunca de la última camiseta de los CSV. Una revisión antigua sigue accesible, con aviso de actualización pendiente. No acredita disponibilidad, lesiones o alineación. Los jugadores sin equipo confirmado no se consideran retirados.

El panel **Filtros, muestras y cuota mínima** se puede plegar. En móviles comienza plegado para dar acceso al listado; pulsa su título para ajustar los filtros.

Los filtros de local/visitante, competición y temporadas se aplican al historial antes de escoger las últimas actuaciones. El equipo de plantilla y el partido próximo seleccionan a quién analizar, sin excluir los partidos del jugador en equipos anteriores. Se pueden combinar temporadas, elegir una muestra personalizada o usar toda la carrera importada. Los retirados confirmados se excluyen de los selectores y tendencias individuales, conservando todos sus registros y aportaciones a los equipos.

Cada tarjeta muestra aciertos/denominador y porcentaje para las últimas 5, 10, 15 y 20 actuaciones, además de la muestra principal, promedio, mediana, actuaciones disponibles y calidad descriptiva. Si solo hay nueve registros válidos, la ventana de 20 usa nueve, sin rellenar datos. Las cuatro ventanas usan los mismos filtros y son independientes del límite de la muestra principal: elegir muestra 5 no reduce la ventana 20 a cinco. Promedio y mediana corresponden a la muestra principal.

Pulsa la tarjeta para abrir el gráfico con la misma estadística, línea, dirección, muestra y filtros históricos. **Volver a tendencias** y la navegación del navegador conservan los filtros de la lista. Se muestran inicialmente 60 candidatos; el botón inferior permite ampliar la lista.

## Generación y clasificación

Se calculan cuantiles interpolados 20/35/50/65/80 de la muestra principal y las medias líneas adyacentes. Las estadísticas no negativas nunca generan líneas inferiores a 0,5; el margen admite líneas negativas. Una serie completamente a cero no genera destacados. Las actuaciones a cero permanecen en los cálculos y denominadores de las demás series. No se modifica el análisis manual de líneas ni se afirma que una casa ofrezca estos mercados.

Se descartan candidatos alejados de la mediana mediante:

```
escala = max(1, Q75 − Q25, abs(mediana) × 0,20)
cercanía = 1 / (1 + abs(línea − mediana) / escala)
```

Se exige cercanía ≥ 0,55 y una muestra de al menos cinco actuaciones. Se exploran las dos direcciones, con desigualdades estrictas: igualar una línea no es un acierto. Se excluyen candidatos sin aciertos. El porcentaje mínimo se aplica antes de seleccionar hasta cuatro candidatos por entidad y estadística. Esto evita que un gran número de líneas similares ocupe toda la lista.

En estadísticas no negativas se excluyen también series con un 90 % o más de ceros, para no destacar automáticamente «menos de 0,5» en estadísticas de participación excepcional. La línea debe quedar entre el 50 % de la mediana y el máximo de 150 % de la mediana o mediana + 1. Son reglas exploratorias de relevancia, no límites comerciales ni garantías predictivas. Los márgenes firmados no están sujetos a esos límites relativos. Todos los ceros permanecen intactos en el historial y en el análisis manual.

La clasificación predeterminada usa:

```
calidad = 100 × WilsonInferior(aciertos, n, z=1,96) × n/(n+20) × cercanía
```

Wilson y el factor de tamaño penalizan muestras pequeñas; cercanía penaliza líneas alejadas del rendimiento central. Es una regla transparente de ordenación descriptiva, no una probabilidad predictiva, intervalo de predicción o medida de rentabilidad. Wilson presupone ensayos independientes e idénticos para su interpretación habitual, algo que los partidos NBA no garantizan. Se permite ordenar expresamente por porcentaje, cantidad o estadística; la calidad permanece visible y sirve para desempatar.

Los cuantiles y las frecuencias se calculan con la misma muestra: hay **sesgo por selección de líneas** y comparaciones múltiples. Una racha del 100 % no acredita una probabilidad futura del 100 %. No se han estimado ni calibrado probabilidades predictivas automáticamente.

## Cuotas

Abre **Cuota y estimación** en una tarjeta e introduce la cuota decimal real y, si dispones de ella, una probabilidad predictiva estimada por ti. No se introduce una cuota automáticamente ni se copia el porcentaje histórico como estimación. Sin cuota aparece **Sin cuota**. El mínimo inicial es 1,20 y puede elevarse; las cuotas inferiores al mínimo configurado se rechazan.

```
probabilidad implícita = 1 / cuota
cuota justa = 1 / probabilidad estimada
valor esperado por unidad = cuota × probabilidad estimada − 1
```

La estimación se introduce en porcentaje, entre 0 y 100. Con 0 %, la cuota justa es infinita. El EV requiere cuota y estimación; sin ellas permanece sin calcular. Es un modelo binario, sin anulaciones, comisiones o corrección del margen de la casa. Un EV positivo bajo una estimación subjetiva no demuestra que exista una ventaja real.

Cuotas y estimaciones solo viven en la memoria de esta sesión; se conservan al volver del gráfico, pero se pierden al recargar. No se envían a servidores ni se guardan en las bases del historial, las plantillas o las identidades. No hay API de cuotas, nuevas credenciales ni servicios de pago.

## Conservación y pruebas

El motor crea vistas de lectura. No escribe ni migra IndexedDB, modifica registros o reconstruye los resultados históricos de los equipos. Cambian las líneas sugeridas y su clasificación; no cambian los marcadores, los cuartos ni las estadísticas originales. Las pruebas cubren ceros, mediana cero, márgenes negativos, muestras y filtros antes de limitar, múltiples temporadas y equipos, retiradas, conservación de estadísticas y fórmulas de cuotas. Las pruebas con copias personales permanecen fuera del repositorio.
