# Correspondencias escalables y preparación de automatización NBA Stat

## Información del proveedor (comunicada por el usuario el 22/10/2026)

NBA Stat no ofrece ni prevé ofrecer correspondencias con IDs NBA. Sus IDs internos son estables. Los nacimientos están anunciados, **no constatados todavía en una respuesta**. No se realizan nuevas consultas con esta actualización.

La autorización comunicada permite recuperar, normalizar, almacenar y publicar estadísticas NBA Stat para este proyecto gratuito y no comercial. No transfiere derechos de NBA.com/ESPN. Los perfiles, nacimientos, correcciones y tablas privadas que ya tiene el usuario solo se usan como evidencia y enlaces personales: no se incluyen en una entrega pública ni se descargan fuentes oficiales nuevas. Se conserva la atribución de NBA Stat. El permiso de publicación no sustituye la verificación de calidad.

## Qué funciona en el navegador

En Datos → importador NBA Stat → **propuestas y verificación por lotes**:

1. Selecciona la revisión privada del box score ya descifrada. Se reutiliza localmente; no se sube a ningún servidor. Se proponen candidatos del catálogo NBA/ESPN existente, con sus alias ya verificados. Los nombres se normalizan por tildes, mayúsculas y puntuación. Las similitudes parciales son solo sugerencias.
2. La tabla separa `linked` (ID estable previamente verificado), `eligible` (evidencias suficientes para revisión en lote), `pending`, `ambiguous` y `conflict`. Un desconocido sigue pendiente, nunca se convierte en «sin historial». El nombre y la relación histórica con un equipo no verifican una identidad.
3. Cuando haya inspecciones privadas de perfiles con nacimiento, selecciona uno o varios JSON ya descargados (máximo 10 MB en total). Introduce las rutas JSON Pointer realmente observadas del array y de los campos relativos a cada fila. No existe un nombre de campo predeterminado para nacimiento. Por ejemplo, `/data` sería una ruta solo si realmente contiene el array; no es una afirmación sobre el formato actual del proveedor. Para un perfil individual deja vacía la ruta del array.
4. Indica nacimiento solo si existe, con formato ISO de fecha `AAAA-MM-DD` revisado. No se infiere desde edad, temporada, un timestamp o el nacimiento canónico. Un campo ausente queda sin nacimiento; un formato desconocido se rechaza para revisar su semántica. Una ruta de equipo opcional usa únicamente IDs de equipos ya revisados.
5. Tras revisar el significado de los campos, genera las propuestas. Solo una coincidencia única de nombre completo normalizado y nacimiento observado igual al canónico previamente verificado es elegible para este método. Dos candidatos iguales, dos IDs internos para una persona, o un nacimiento contradictorio bloquean la aprobación. Un traslado de equipo no invalida un ID estable.
6. Revisa y aprueba el lote elegible con el botón **Verificar y guardar lote elegible localmente**. Se integra directamente en las correspondencias del importador y su IndexedDB NBA Stat existente. No cambia las identidades NBA/ESPN originales ni requiere reimportar temporadas. Los métodos anteriores realmente verificados siguen siendo compatibles. Ya no se ofrece esperar un nuevo cruce oficial del proveedor.
7. Cada enlace nuevo conserva IDs, nombres contrastados, nacimiento, rutas observadas, referencia canónica, fecha de revisión y una huella SHA-256 del documento privado NBA Stat. La huella identifica el documento para auditoría; **no acredita que el proveedor lo haya firmado**. La procedencia auténtica y la semántica siguen siendo declaradas por quien revisa los archivos.
8. Exporta el informe, el catálogo o **el registro privado conectado al recolector**. Este último reúne catálogo, correspondencias de jugadores y enlaces de partidos, manteniendo ambos tipos separados. Contiene evidencias personales: no subir al repositorio público. La carga en el almacenamiento privado de producción y su clave persistente todavía no están configuradas ni se han ejecutado.

El porcentaje mostrado usa únicamente el lote realmente seleccionado: enlaces reutilizables / observaciones y propuestas elegibles / observaciones. No extrapola a 519 jugadores ni a toda la temporada. No hemos tenido acceso a los archivos privados del usuario para medir cobertura real. Los 434 enlaces NBA/ESPN previos no equivalen a 434 enlaces NBA Stat.

## Partidos por lotes

`referencesFromGameIndex` admite un índice privado mediante rutas observadas, sin asumir cómo se llaman los campos del proveedor. `inspectGameReferenceBatch` compara todos los partidos con el calendario publicado usando IDs de equipos revisados, temporada, estado final, marcador y un instante con zona explícita. No utiliza nombres de jugadores, ni supone que IDs numéricos coincidentes identifican el mismo partido. Fechas sin zona, calendarios ambiguos o IDs repetidos quedan pendientes.

Se reutilizan una vez verificadas las evidencias de equipos y la interpretación de valores del proveedor. La comparación mecánica es por lotes; las propuestas no equivalen a aprobaciones. En esta primera versión se exige coincidencia exacta del instante, de forma conservadora. Si un proveedor publica una hora diferente, se requiere aclaración o evidencia de corrección; no se copia la hora de BALLDONTLIE para superar el control.

## Conexión efectiva con el recolector privado

- `correspondence-registry.js`: catálogo privado + correspondencias estables + enlaces de partidos; rechaza reasignaciones automáticas y contradicciones.
- `correspondence-cycle.js`: reúne calendario incremental, registro, revisión de enlaces de partidos y revalidación de box scores ya descargados. Los bloqueados por identidades se reintentan localmente al aportar el lote; no se repite la consulta.
- Si una observación posterior contradice un nacimiento ya vinculado, el recolector conserva el enlace y los resultados anteriores, pero guarda un bloqueo persistente y suspende su uso para nuevas validaciones. No se levanta por omitir el perfil en otra ejecución: requiere una observación corregida revisada y resolución explícita.
- El estado existente admite el registro como un campo opcional `correspondences`. Los checkpoints antiguos siguen siendo válidos y no se inicializan de nuevo. El adaptador privado ya probado cifra también ese registro dentro del manifiesto, con la misma integridad, control de revisión y conservación de trabajos anteriores. No se han creado ramas ni checkpoints remotos reales.
- `runCorrespondencePreparation` lee y escribe mediante el adaptador duradero explícito bajo su control de concurrencia. No tiene transporte NBA Stat ni contador propio.
- `runPreparedCollectorCycle` se detiene inmediatamente con la configuración publicada desactivada. Cuando se autorice su configuración futura, exigirá el adaptador de cuota enlazado por `bindSharedQuota` al repositorio público y a la rama existente `nbastat-probe-quota`, antes de delegar en `runOneSyncDownload`. Un contador independiente es rechazado. El cliente existente reserva antes de HTTP y respeta 10 solicitudes por ventana móvil de 60 minutos y errores 429.
- La validación conserva controles de DNP, minutos, marcador y estadísticas. La incorporación real y la publicación siguen bloqueadas. Las pruebas ficticias sí recorren registro → cola cifrada persistente → recuperación en otro proceso → validación → incorporación → paquete de entrega de pruebas → gráficos existentes. No se introducen cuartos ficticios ni se publican registros de equipos incompletos.
- La entrega de pruebas contiene actuaciones y ausencias del proveedor; no incluye el catálogo, nacimientos, rutas ni huellas privadas de verificación. El transporte público de producción, cron y consumidor real siguen pendientes de habilitar tras la prueba de calidad; esta actualización no los activa.

## Prueba real controlada del caso 1369: siguiente paso

Usar exclusivamente el archivo privado ya descargado, sin una nueva petición:

1. Contrastar y aprobar localmente `bdl:game:21717855` ↔ NBA Stat `1369` con los campos reales. Se conocen por el calendario y el informe del usuario Detroit local 121, Boston visitante 113 y fecha 20/10/2026. Aún no hemos inspeccionado sus IDs de equipos ni la semántica de su hora en el archivo privado. No usar la muestra ficticia como evidencia.
2. Generar las propuestas de los 35 registros. Los 22 participantes necesitarán enlaces fiables; los 13 DNP no se incorporan ni cuentan en denominadores. Cade, ID NBA Stat 1548 y NBA 1630595, sigue necesitando evidencia independiente suficiente para el cruce: su nacimiento NBA conocido no acredita que se haya observado en NBA Stat.
3. Cuando el proveedor ofrezca nacimientos, verificar **una muestra privada de perfiles o página de listado**, no hacer una petición por jugador sin necesidad. Primero observar su esquema real; después usar el lote. El número de consultas dependerá de cobertura y paginación realmente disponibles, siempre con el contador compartido. Esta actualización no realiza esas consultas.
4. Si los nacimientos no llegan, aportar evidencia independiente adicional verificada mediante los métodos manuales existentes. No aprobar únicamente por nombre, equipo o la afirmación de que el ID es estable. No hay motivo para esperar un cruce oficial que el proveedor ha descartado.
5. Al resolver los participantes y los controles del partido, usar el importador privado existente para comprobar el nuevo punto cronológico y tendencias de Cade. Después configurar el registro y la clave persistente en el repositorio privado, probar un único ciclo autorizado con el contador existente y habilitar entrega pública **solo** de datos NBA Stat validados y autorizados. No publicar perfiles ni históricos personales NBA/ESPN.

No se han verificado identidades reales nuevas en esta actualización. Sin las muestras privadas no es honesto dar un porcentaje de cobertura real. El motor permite automatizar la comparación, reutilización, deduplicación y revalidación; la aprobación inicial necesita evidencia suficiente y revisión de los lotes.
