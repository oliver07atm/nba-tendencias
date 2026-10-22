# NBA Stat: comprobar identidades sin inventar nacimientos

> Actualización 22/10/2026: NBA Stat ha confirmado que no ofrece ni prevé ofrecer cruces NBA. Los métodos antiguos se conservan para evidencias ya verificadas; no se debe esperar una tabla oficial nueva. Consulta el [motor propio por lotes](nbastat-identity-automation.md). Los nacimientos están anunciados, aún no observados.

La documentación oficial confirma `GET /api/v1/players/{player_id}` y la lista `/api/v1/players`, pero **no publica el esquema de esos perfiles ni garantiza que incluyan nacimiento o IDs externos**. No se ha realizado una consulta autenticada nueva para esta actualización. Por tanto, todavía no sabemos si el perfil privado 1548 proporciona esos datos.

La fuente NBA.com consultada identifica a Cade Cunningham con **NBA 1630595** y nacimiento **25/09/2001**: https://www.nba.com/player/1630595/cade-cunningham. Eso confirma la identidad canónica; no demuestra por sí solo que NBA Stat 1548 sea el mismo jugador. No se debe copiar esa fecha a «observada en NBA Stat» si no aparece allí.

## Primera comprobación privada: una sola solicitud

1. Conserva los secretos existentes **`NBASTAT_API_TOKEN`** y **`NBASTAT_PROBE_PASSPHRASE`**. No hace falta otra clave. No los escribas en el navegador o chat.
2. Cuando decidas ejecutar la prueba, abre Actions → **NBA Stat - inspección privada de identidades** → Run workflow → rama **main**.
3. Confirmación **`INSPECT_PLAYERS`**, casilla de ausencia de clientes externos activos, modo **`profile`**, `player_id` **`1548`**. No hace falta esperar una hora si queda cuota. Deja las opciones de lista sin usar para esta primera inspección.
4. La ejecución realiza **una** llamada a `/api/v1/players/1548`. Usa la misma rama persistente de cuota y el mismo grupo de concurrencia que las otras pruebas: diez peticiones por ventana móvil de 60 minutos para todos los endpoints, reserva antes de HTTP, bloqueo por 429/Retry-After, sin reiniciar el historial ni reintentar inmediatamente. Sin cuota, aplaza sin consultar.
5. Descarga **`nbastat-private-player-inspection`** antes de un día. Solo contiene el archivo `review.sealed.json` cifrado; los valores no se imprimen ni se guardan en claro en el runner. SUCCESS solo acredita preparación de la muestra, no una identidad verificada.
6. Descífralo localmente con el script existente, usando un nombre diferente para conservar también la muestra del partido:

```bash
read -rs -p 'Contraseña privada de la muestra: ' NBASTAT_PROBE_PASSPHRASE
export NBASTAT_PROBE_PASSPHRASE
node scripts/open-nbastat-review.mjs work/review.sealed.json work/nbastat-player-review.json
unset NBASTAT_PROBE_PASSPHRASE
```

No envíes la contraseña ni publiques el archivo descifrado. No hace falta compartir el JSON completo: basta comunicar los nombres/tipos de los campos relevantes y qué referencias de identidad se han comprobado, sin credenciales. Si el campo contiene una fecha, revisar su significado y formato antes de usarla; no asumir que cualquier fecha es nacimiento.

## Tres métodos admitidos en Datos

El formulario **Método de verificación** distingue estas vías. Todas mantienen el nacimiento canónico, los IDs, perfiles y fecha de revisión. La validación local acredita consistencia de la evidencia declarada, **no autentica por sí sola una respuesta o un correo**.

1. **Nacimiento contrastado en ambas fuentes.** Mantiene las correspondencias anteriores. Solo usarlo si el nacimiento se ha observado realmente en NBA Stat y coincide con el perfil NBA/ESPN. Las correcciones previas no se migran ni pierden información.
2. **Referencia explícita al ID NBA/ESPN en perfil privado.** Sirve aunque NBA Stat no ofrezca nacimiento. Selecciona el perfil descifrado en el formulario y aporta las rutas **JSON Pointer realmente observadas** del ID interno y del ID externo o URL de perfil oficial. No hay rutas por defecto ni equivalencias de campos inventadas. La herramienta comprueba que el ID interno coincide con el perfil solicitado, que el valor externo identifica exactamente el NBA/ESPN elegido y que la URL es oficial cuando se usa una URL. Debes verificar que el campo significa realmente ID NBA/ESPN, no un número casualmente igual. Un nombre, dorsal o pertenencia de equipo no sustituyen una referencia explícita. Se conserva `sourceBirthDate: null`: no se afirma haber observado nacimiento en NBA Stat.
3. **Correspondencia explícita confirmada por NBA Stat.** Si la API no ofrece nacimiento ni referencias externas, pedir al proveedor una confirmación que relacione **1548 → NBA 1630595** (o ESPN ya contrastado). Debe proceder realmente del proveedor y contener ambos identificadores, no solo un nombre. Conservar el correo/documento privadamente y anotar una referencia local como `private-email:fecha:referencia-local` o `private-document:fecha:referencia-local`. El formulario no sube el correo. Este método exige confirmar esa evidencia real y el perfil/nacimiento canónico; no pide afirmar que NBA Stat publica nacimiento. Sin respuesta explícita, dejar pendiente.

La segunda y tercera vías combinan una referencia del proveedor que vincula IDs con la comprobación independiente de la identidad canónica en NBA.com/ESPN. No se consideran suficientes solo un nombre parecido, equipo, estadísticas resumidas de un encuentro, o la misma fecha copiada desde NBA.com a los dos lados. Contradicciones de ID, nacimiento canónico, duplicados o correspondencias antiguas siguen rechazándose.

## Evitar 22 consultas y revisiones repetidas

Después de revisar el perfil de Cade:

- Si los perfiles exponen referencias externas explícitas, comprobar si también aparecen en la **lista paginada**. El mismo workflow permite **`players-list`**, una página de hasta cien resultados, filtro opcional por ID **interno NBA Stat** de equipo y sin recorrer páginas automáticamente. No se usa un ID NBA/BDL como `team_id`. Es otra consulta, no un lote de 22 perfiles. El esquema de la lista todavía debe observarse: no se presupone idéntico al detalle.
- La web admite preparar un lote desde esa lista privada. En el método de referencia explícita selecciona el JSON de inspección descifrado, indica la ruta real del array y las rutas de los IDs **relativas a cada fila**, escoge NBA o ESPN y confirma la semántica de los campos una vez. Pulsa **Preparar lote por IDs explícitos revisados**. El proceso enlaza únicamente IDs externos exactos ya presentes en tus identidades y nacimientos canónicos revisados; no compara nombres ni inventa un nacimiento de NBA Stat. Solo prepara jugadores presentes en el archivo del partido seleccionado. Los IDs desconocidos o nacimientos canónicos no revisados quedan pendientes; IDs internos duplicados bloquean el lote.
- Los resultados se revisan en la vista previa y se guardan/exportan/importan con el mismo sistema local de correspondencias. Se reutilizan en futuros partidos del jugador, sin otra revisión por encuentro ni cambio de sus datos históricos. El esquema de campos puede reutilizarse después en el recolector, tras verificarlo con datos reales.
- Si no hay IDs externos, usar el motor propio de propuestas y esperar una muestra real de nacimientos para revisar el esquema y verificar lotes únicos. Nombre y equipo sin evidencia adicional siguen pendientes. No pedir ni esperar una tabla de correspondencias que el proveedor ha descartado.

Texto orientativo para solicitar al proveedor (no se ha enviado):

> ¿Pueden confirmar si `/api/v1/players/1548` y la lista de jugadores incluyen nacimiento, ID NBA, ID ESPN o una URL oficial que identifique al jugador? Si esos campos no están disponibles, ¿pueden facilitar una tabla que relacione sus IDs internos con NBA/ESPN, empezando por 1548 → NBA 1630595 y los participantes del partido 1369? No necesitamos fechas de nacimiento adicionales si la correspondencia de IDs está confirmada explícitamente.

## Conservación y estado actual

No se ha marcado como verificado el cruce real de Cade: falta revisar la respuesta autorizada o recibir la confirmación explícita. No se ha consultado el perfil privado ni la lista durante el desarrollo. No se ha activado programación, sincronización masiva ni publicación de datos privados.

El nuevo workflow conserva la cuota y los secretos; el navegador no incluye el transporte autenticado. Las nuevas evidencias se guardan solo en la base NBA Stat, junto a las correspondencias anteriores compatibles. Los 93.224 registros originales, las 519 fichas, las 434 identidades NBA/ESPN, las retiradas y el calendario no se modifican.
