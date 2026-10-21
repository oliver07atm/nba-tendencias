# Estadísticas posteriores al partido: auditoría y estado

Revisión: **21/10/2026**. Objetivo: 0 €, uso personal para análisis relacionado con apuestas, frontend público en GitHub Pages. **No se ha encontrado una fuente gratuita que hayamos podido aprobar en cobertura y permisos para este caso. La actualización automática de actuaciones continúa desactivada.** No equivale a afirmar que no exista ninguna en el mercado.

> El calendario se amplió posteriormente con vista mensual, descarga inicial por temporada y revisiones incrementales/semanales. Consulta [el funcionamiento actual del calendario](calendario-balldontlie.md). Las actuaciones individuales siguen desactivadas.

## Arquitectura comprobada

- Actions descarga `/v1/games` de BALLDONTLIE una vez al día (08:17 UTC, ejecución sujeta a las demoras de GitHub). La clave solo se utiliza allí. Publica un JSON de calendario y marcadores. No es seguimiento en directo ni incluye box scores.
- `scripts/update-data.mjs` es un publicador genérico de un conjunto completo, con controles de derechos y precisión. `data-source.json` sigue con `enabled: false`. No es un sincronizador incremental de IndexedDB; no se ha activado ni sustituido su fuente por ESPN o NBA.com.
- Las tres bases personales —históricos, plantillas y correcciones/estados— siguen separadas en el navegador. Actions no puede leerlas ni actualizarlas con el navegador cerrado. Las vistas de identidades son de lectura y conservan los equipos anteriores.
- Los gráficos y las tendencias solo analizan los registros disponibles. Un marcador final no contiene información suficiente para derivar asistencias, rebotes, tiros, minutos o cuartos. Tampoco permite determinar quién fue DNP.

## Fuentes y decisión

| Fuente | Cobertura técnica documentada | Permisos y decisión |
|---|---|---|
| [BALLDONTLIE](https://docs.balldontlie.io/#account-tiers) | Partidos gratis; Game Player Stats requiere ALL-STAR y Box Scores GOAT | Se conserva exclusivamente el calendario gratuito. No se han usado endpoints de pago, pruebas con tarjeta ni upgrades. |
| [API-NBA / API-SPORTS](https://api-sports.io/sports/nba) | Anuncia 100 consultas/día. Documenta actuaciones en `/players/statistics`, equipos en `/games/statistics` y periodos en `/games` | [Sus términos, Service & data](https://api-sports.io/terms), no conceden licencia de publicación y remiten al usuario a los titulares; mencionan licencias adicionales para apuestas, entre otros usos. Es la candidata técnica prioritaria para solicitar aclaración, **no una fuente aprobada**. |
| [Highlightly](https://highlightly.net/nba-api/) | Box scores individuales documentados; plan Basic limitado | [Sección 7](https://highlightly.net/terms/): restricción relevante sobre apoyar operaciones de apuestas. No se presume una excepción por llamarse análisis personal. No conectada. |
| [NBA.com](https://www.nba.com/termsofuse) | Estadísticas oficiales disponibles para consulta | §9 restringe apuestas y bases actualizadas; no conectada. |
| [SportsDataverse](https://github.com/sportsdataverse/hoopR-nba-data) / ESPN | El conversor existente admite actuaciones y periodos históricos | La licencia del repositorio no acredita permiso de la fuente original. [ESPN remite a Disney](https://support.espn.com/hc/en-us/articles/360035445091-Terms-of-Use); [sus términos](https://disneytermsofuse.com/english/) restringen extracción automatizada y reutilización. El uso personal no autoriza por sí solo esta automatización. No se ha añadido un scraper ni republicado datos. |
| [TheSportsDB](https://www.thesportsdb.com/docs_api_guide.php) | API v1 gratuita: métodos genéricos con límites (estadísticas de jugador: 10 resultados; estadísticas de evento: 5) | No se ha acreditado un box score NBA completo de los 30 equipos, con cuartos y todos los campos requeridos. [Sus condiciones](https://www.thesportsdb.com/docs_terms_of_use.php) mantienen obligaciones respecto a derechos de terceros. No se afirma que prohíban expresamente este proyecto. |

Se revisaron páginas oficiales de planes, documentación y condiciones, no solo repositorios o anuncios de terceros. No se han descargado nuevas bases de estadísticas ni ejecutado consultas de actuaciones con autenticación. La profundidad y precisión efectiva del plan gratuito de API-NBA siguen sin probarse. Véase también [la revisión detallada de alternativas](alternativas-api-gratuitas.md).

## Mejoras implementadas

1. Aviso visible junto al calendario, los gráficos y las tendencias: estadísticas automáticas desactivadas; fecha de la última actuación disponible; diferencia explícita entre marcador e historial. La demostración nunca se cuenta como cobertura real.
2. **Datos → Actualización de estadísticas**: fecha máxima de actuaciones de jugador/equipo, fecha de guardado local separada, última descarga del calendario, errores, fuentes y finales sin cobertura compatible. No presenta un guardado local como una descarga nueva de NBA.
3. Comparación de diagnóstico entre calendario e historial por franquicias normalizadas, localía, día de Canarias y un único partido con ID de origen. No se equiparan IDs numéricos BDL/ESPN. Detecta registros parciales, fechas ambiguas, marcadores distintos y puntos individuales que no suman el marcador. «Compatible» no es «oficial verificado»: no certifica identidad, DNP, rebotes, otros campos ni correcciones tardías. Un CSV antiguo sin ID de partido reconocible puede seguir pendiente aunque tenga actuaciones.
4. Actions conserva los finales descargados de la temporada desde julio, además de la ventana móvil del calendario. Las consultas posteriores reemplazan el mismo ID, incluido un cambio de marcador/estado; no se añaden filas personales. Cada partido conserva la fecha de su consulta. Solo se reconsultan los que están dentro de la ventana móvil; los finales antiguos pueden tener correcciones posteriores desconocidas. No se agregan peticiones al proveedor. La conservación empieza con lo disponible al instalar esta versión: no rellena retrospectivamente partidos nunca descargados. Al cambiar de temporada se descarta el archivo de finales anterior del calendario público, **no los históricos privados**.
5. El navegador relee únicamente el JSON público al abrir la web, al volver a una pestaña visible y cada 15 minutos visible, con botón manual, petición única en curso y timeout. Mantiene la última descarga ante errores. Esto permite revisar finales conservados tras días sin abrir la web; **no recupera actuaciones que nunca se descargaron**.

No hay proceso de sincronización estadística oculto ni reintentos hacia fuentes no autorizadas. No se ha creado otra base personal ni migrado/borrado las existentes. La tabla de diagnóstico está en memoria; no exporta datos a servidores.

## Solución completa pendiente, si se obtiene permiso gratuito

La opción a investigar primero es API-NBA, mediante una aclaración escrita del proveedor y, si corresponde, del titular. No basta una clave gratis. Hay que confirmar acceso automático a 2026-27, almacenamiento, análisis personal relacionado con apuestas, conservación/correcciones y, para usar Actions + JSON público de Pages, redistribución pública. Pedir también límites efectivos, DNP, cuartos/prórrogas, identificadores y frescura. No se ha enviado una solicitud en nombre del usuario.

Sin permiso de redistribución pero con autorización explícita de consulta privada podría estudiarse un recolector privado local, con credenciales fuera de la web. Requeriría un equipo propio encendido y entrega privada al navegador; no está implementado y no sería una actualización puramente automática de Pages. Una cuenta/repo privado no elimina las restricciones de extracción o uso. La importación local actual sigue disponible para archivos que el usuario pueda usar conforme a sus condiciones.

Diseño pendiente, **no implementado ni probado con una fuente autorizada**:

- Actions: presupuesto fijo de consultas, cola persistente de finales desde el inicio de temporada, reintentos espaciados, controles por estado final y revisiones posteriores. Por ejemplo, 15 partidos × 2 consultas (jugadores/equipo) + calendario = 31/día antes de paginación y revisiones; 100/día podría permitir lotes, no promete inmediatez después de cada final.
- Feed público solo si está autorizado: manifiesto durable de toda la temporada, paquetes de partido completos con procedencia y revisiones monotónicas, sin claves. IDs con namespace y correspondencia de partidos explícita, sin comparar números BDL/ESPN ni nombres de jugadores.
- Navegador abierto: descarga de revisiones pendientes y capa de actualizaciones separada del historial importado. Upsert por origen/partido/jugador y reemplazo atómico de revisión completa, sin mutar los 93.224 originales. Aplicación de correspondencias NBA/ESPN existentes para gráficos, también con equipos anteriores. Al reabrir, recorrer el manifiesto completo desde el checkpoint; una ventana reciente no es suficiente.
- Validar actuaciones jugadas (DNP separado, nunca insertar ceros), todos los campos requeridos, suma de puntos, tiros coherentes, ambos equipos, cuartos/prórrogas reales. Si falta un campo o no se identifica al jugador, informar y mantener el partido pendiente; no completar con ceros. Revisiones incompletas no sustituyen versiones válidas. Rebotes de equipo no tienen por qué ser la suma de rebotes individuales.
- Comparar actuaciones de partidos concretos con originales y probar que una nueva revisión cambia gráficos/ventanas de tendencias sin duplicados ni alteración del histórico base. Solo después activar el feed y su programación.

## Verificación y límites

`npm test` y `npm run build`. Pruebas sintéticas declaradas cubren diagnósticos, ausencia de DNP inventados, namespaces, alias de equipos, fechas/localía, conflictos de puntuación, datos inmutables, conservación de finales y correcciones de calendario. Las pruebas sintéticas no acreditan un servicio de datos real.

Se ha recuperado el calendario público producido por Actions del 21/10/2026: contiene Boston–Detroit finalizado (`bdl:game:21717855`). Sirve para reproducir el aviso de actuaciones ausentes frente al histórico local, **no para atribuir estadísticas a jugadores**. La prueba de una actuación real nueva de 2026-27 llegando automáticamente al gráfico queda bloqueada por la fuente: no se presenta como completada.

No hace falta una nueva clave ni activar servicios. Tras desplegar, recarga la web y abre Datos. Las fuentes continúan sin verificar para automatización; no hay una configuración que debas activar para forzar descargas.

Las comprobaciones locales con copias de los archivos personales conservaron 93.224 registros, 519 fichas y 434 enlaces. En Chromium se verificaron el aviso del final Boston–Detroit, gráficos históricos de Cade (PRA, visitante, muestra de 150), Atrás y filtros recordados, tendencias con muestras de 200, fallos/reintentos del calendario, recarga y vista móvil. Los hashes de las tres bases IndexedDB no cambiaron durante los análisis y comprobaciones; no hubo envíos de archivos. No se ha inspeccionado ni alterado el navegador real del usuario.
