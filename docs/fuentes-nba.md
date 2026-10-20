# Investigación de fuentes NBA gratuitas

Revisión del 20 de octubre de 2026. **Resultado: no habilitar ni publicar el histórico de ESPN/SportsDataverse mientras los derechos de la fuente original y la precisión no estén verificados.** La web pública conserva su demostración. Esta revisión es una decisión operativa para este proyecto, no una afirmación de que ningún uso de estadísticas deportivas sea legalmente posible.

## Qué se ha inspeccionado

- [hoopR-nba-data](https://github.com/sportsdataverse/hoopR-nba-data): pipeline que transforma datos de ESPN; su README anuncia histórico desde 2002. No confundir este repositorio de procesamiento con una fuente independiente de resultados.
- [sportsdataverse-data](https://github.com/sportsdataverse/sportsdataverse-data): publicaciones de archivos CSV, Parquet y RDS. Las descargas consultadas son gratuitas y no requieren contratar una API.
- Releases concretas: [jugadores](https://github.com/sportsdataverse/sportsdataverse-data/releases/tag/espn_nba_player_boxscores), [equipos](https://github.com/sportsdataverse/sportsdataverse-data/releases/tag/espn_nba_team_boxscores) y [calendario](https://github.com/sportsdataverse/sportsdataverse-data/releases/tag/espn_nba_schedules).

El inventario de assets consultado incluye nombres anuales desde 1994 hasta 2026 para jugadores/equipos y hasta 2027 para calendarios. Algunas descripciones de releases todavía indican 2002–2026 y recuentos inferiores al inventario. **Un nombre de archivo no demuestra cobertura completa: solo se han inspeccionado los contenidos de 2025 y 2026**, que corresponden al año FINAL de la temporada.

## Cobertura observada de los archivos descargados

| Archivo / contenido | 2024-25 (`2025`) | 2025-26 (`2026`) |
|---|---:|---:|
| `player_box`: filas, incluidas DNP y exhibiciones | 35.250 | 34.883 |
| `team_box`: filas | 2.648 | 2.652 |
| Partidos distintos en box scores brutos | 1.324 | 1.326 |
| Filas de calendario | 1.329 | 1.330 |
| Intervalo de `game_date` | 22/10/2024–22/06/2025 | 21/10/2025–13/06/2026 |
| Filas marcadas `did_not_play=true` | 6.857 | 6.082 |
| Franquicias NBA identificadas después de excluir All-Star | 30 | 30 |

Son recuentos observados en copias locales de assets mutables, **no certificación de que todos los encuentros esperados estén presentes o sean correctos**. No se ha conciliado cada jornada contra un calendario oficial. La fecha `game_date` de ESPN puede corresponder a la fecha local del estadio; el importador usa el instante con zona del calendario y lo transforma a UTC, dejando a la interfaz mostrar Canarias.

### Estadísticas disponibles

`player_box` tiene una fila por jugador y encuentro, con `game_id`, `athlete_id`, equipo, rival, local/visitante, temporada y tipo de competición. Se comprobaron columnas de puntos, rebotes, asistencias, triples anotados/intentados, tiros de campo anotados/intentados, robos, tapones, pérdidas y minutos; también incluye tiros libres, rebotes ofensivos/defensivos y otras variables que la interfaz aún no analiza.

Los minutos de algunos registros están redondeados por el origen; convertir `37.0` a número no permite recuperar segundos desconocidos. Existen filas DNP y filas marcadas como disputadas con minutos ausentes: se excluyen estas últimas de la importación en vez de asignar cero. No se interpreta `active=false` o un texto de `reason` como DNP si contradice el indicador explícito de participación.

`team_box` incluye marcadores finales y totales por equipo, **sin columnas de cuartos** en los CSV inspeccionados. Los cuartos están en `home_linescores` y `away_linescores` del calendario; se enlazan por `game_id`. Los CSV contienen representaciones tipo Python/NumPy (diccionarios adyacentes y comillas simples), no siempre JSON válido. El parser añadido reconoce esos literales sin ejecutar código.

La lista de periodos permite calcular Q1–Q4, mitades y prórrogas. Se comprueba que la suma coincida con ambos marcadores del box score y del calendario. Si faltan periodos, un box score o un indicador obligatorio, se excluye el partido del conjunto convertido. Esto detecta incoherencias internas, no errores que se repitan en todas las tablas.

Tipos de temporada encontrados: `2` temporada regular, `3` playoffs y `5` play-in. Los datos incluyen exhibiciones All-Star bajo tipo 2: no basta filtrar por competición. Se usan los IDs de las 30 franquicias de ESPN y se excluyen los equipos especiales. No se identifica por separado la Copa NBA con el esquema actual.

## Derechos: licencia del repositorio y fuente original

1. [`hoopR-nba-data/LICENSE.md`](https://github.com/sportsdataverse/hoopR-nba-data/blob/main/LICENSE.md) declara **CC BY 4.0** para datos, código y documentación. `DESCRIPTION` también indica CC BY 4.0.
2. [`sportsdataverse-data/LICENSE`](https://github.com/sportsdataverse/sportsdataverse-data/blob/master/LICENSE) declara **MIT** y se refiere a software y documentación. No se ha encontrado en los archivos revisados una autorización separada de ESPN para la redistribución pública pretendida.
3. Las releases y el pipeline identifican explícitamente **ESPN NBA API** como fuente de estos datos. Cambiar el lugar de descarga no cambia su procedencia.
4. Las [condiciones de Disney en inglés](https://disneytermsofuse.com/english/) incluyen los productos ESPN y establecen restricciones sobre reproducción, distribución y extracción automatizada en las secciones 2.A y 2.B. Las [condiciones globales en español](https://disneytermsofuse.com/spanish/) también deben revisarse junto con los términos regionales/específicos que correspondan; la [página de España](https://disneytermsofuse.com/spanish-spain/) remite a los globales para servicios globales. No se ha verificado una excepción o permiso aplicable al despliegue público de esta base de datos.
5. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode.en), secciones 1 y 2, solo concede derechos que el licenciante tenga autoridad para conceder. No resuelve por sí sola los derechos de terceros ni las obligaciones asociadas a la fuente.

**Decisión:** no tratar estos archivos como una fuente autorizada para NBA Tendencias. No basta añadir atribución o que la web sea gratuita. Hace falta documentar un permiso de la fuente original que cubra almacenamiento, transformación y redistribución pública, o una base jurídica aplicable debidamente revisada. No se ha solicitado permiso a terceros ni contactado con los mantenedores.

No se han usado logos ni fotografías de ESPN. No se ha ejecutado su API ni automatizado extracción directa de ESPN. Las copias examinadas provienen de los assets de GitHub y permanecen en `work/`, excluido de Git y de `dist/`.

## Precisión frente al origen: no verificada

Se intentó consultar directamente las páginas originales de los partidos [401704627](https://www.espn.com/nba/boxscore/_/gameId/401704627) y [401766128](https://www.espn.com/nba/boxscore/_/gameId/401766128) para contrastar P/R/A/triples. Ambas devolvieron una verificación antirrobot/JavaScript al navegador de investigación. **No se ha superado esa barrera ni se afirma que las cuatro métricas hayan sido contrastadas.** Leer una segunda copia del JSON dentro de SportsDataverse no sería una validación independiente frente a la fuente original.

La integración pública queda detenida tanto por el permiso pendiente como por esa comprobación. Antes de habilitar una futura fuente se requieren al menos dos partidos contrastados con el original, identificando jugador, encuentro, URL, métricas y resultado. Esto será una muestra, no una auditoría completa de la temporada.

## Preparación técnica realizada

- Conversor sin red de los tres CSV, validación de identificadores, fechas, partidos completos, estadísticas obligatorias y suma de cuartos.
- IDs estables de jugador (`espn:player:<id>`) y de actuación (`espn:game:<id>:player:<id>`), sin confundir homónimos ni perder el historial tras un traspaso.
- Normalización de abreviaturas (`GS`→`GSW`, `NY`→`NYK`, `NO`→`NOP`, etc.) usando IDs de franquicia, no coincidencias de nombres.
- Unión de temporadas con deduplicación; los conflictos se rechazan. No se mezcla histórico con demostración.
- Salida exclusivamente local en `work/`, marcada **importada, histórica sin verificar**, con derechos y precisión pendientes. No se escribe `public/data/current.json`.
- Los partidos ya terminados no se incorporan como próximos encuentros. La sección Tendencias requiere un calendario futuro autorizado e independiente del histórico.
- Publicación automática desactivada; el actualizador ahora exige evidencia del permiso original y comprobaciones de precisión además de la licencia declarada del repositorio.
- Gráficos y filtros existentes conservados. La interfaz admite IDs estables y explica el origen del conjunto importado sin llamarlo dato verificado.

### Ensayo local de conversión, sin publicar resultados

| Resultado del conversor | 2024-25 | 2025-26 |
|---|---:|---:|
| Partidos incluidos tras controles | 1.321 | 1.321 |
| Actuaciones de jugadores completas | 28.265 | 28.671 |
| Registros totales (jugadores + equipos) | 30.907 | 31.313 |
| Partidos especiales fuera de las 30 franquicias | 3 | 4 |
| Partidos incompletos o rechazados | 5 | 5 |
| DNP omitidos | 6.857 | 6.082 |
| Jugadores sin campos obligatorios | 83 | 45 |
| Otras filas de jugador sin partido incluido | 45 | 85 |

En 2025-26 uno de los partidos completados se excluyó por carecer de `total_turnovers` en un equipo. Las dos temporadas producen 62.220 registros combinados. Estos ensayos solo acreditan compatibilidad del esquema y consistencia de las comprobaciones implementadas. **No son una integración real aprobada ni una garantía de exactitud.** No se adjuntan al repositorio los históricos ni los resultados por jugador.

## Ampliación a 100, 150 y 200 partidos

El conversor ya recorre los 30 equipos y admite añadir más archivos anuales, con filtros posteriores a la unión. Dos temporadas regulares permiten como máximo 164 actuaciones por jugador antes de considerar playoffs, ausencias y play-in. Muchos jugadores necesitarán tres o más temporadas para disponer de 200 actuaciones. La interfaz siempre debe indicar el número disponible y no rellenar partidos ausentes.

Cuando la fuente esté autorizada y contrastada: comenzar con una temporada completa; conciliar IDs y totales contra un inventario oficial de partidos; después añadir la segunda y una tercera temporada. Se deben revisar casos de traspasos, homónimos, DNP, Copa NBA, prórrogas y jugadores que no alcanzan la muestra solicitada. Las pruebas de 200 actuaciones son sintéticas y comprueban el algoritmo, no que un jugador real tenga 200 actuaciones en estos archivos.

El importador del navegador acepta hasta 64 MB y 100.000 registros. Para históricos más extensos o móviles con poca memoria, la siguiente fase será dividir los archivos por temporada/equipo o jugador y cargar solo las partes necesarias. No se afirma que esté implementada esa carga fragmentada. La vista de jugadores de un equipo enumera nombres observados en sus registros; ese histórico no acredita una plantilla vigente. Un calendario futuro y sus plantillas necesitarán una fuente autorizada y conciliación adicional.

## Procedimiento futuro de habilitación

Ver `docs/importar-hoopr.md`. La evidencia de derechos y el contraste de precisión deben obtenerse antes de colocar estadísticas en `public/` o activar Actions. Una bandera técnica no otorga derechos. Mientras esto siga pendiente, `data-source.json` permanece desactivado y `npm run update-data` no descarga nada.

## Huellas de los assets inspeccionados

Las URLs de release pueden conservar el nombre y cambiar de contenido. Estas huellas SHA-256 identifican las copias usadas para los recuentos anteriores; no se publican las copias.

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `player_box_2025.csv` | 17909380 | `8e34c5b1b7629dda89483356b5ec40f76a0b534aa273a5ddd8d9ef23f3e0e4f7` |
| `team_box_2025.csv` | 1170754 | `0d30b0ae0a6f5578d0ba8418ce361cd20e5faa4fa7feb04fbc9e21c396b408af` |
| `nba_schedule_2025.csv` | 2216279 | `a7a5b6607a256c84a324f819e4461248bdff90a78b1ddb675a5a117a9a94e74f` |
| `player_box_2026.csv` | 17729581 | `7a4868da67ae7f6ebfba23389e04220be2e3f69d2e56a3942c02aa56f1becc89` |
| `team_box_2026.csv` | 1184546 | `c5dcf467c15763aff7b78f6e5de0357c5fca8a77434f7371a41ee7846d4ce178` |
| `nba_schedule_2026.csv` | 9153001 | `5a4a7473fce1c49d56382211c5955ad405f421d59869143b1d501e997e79223e` |
