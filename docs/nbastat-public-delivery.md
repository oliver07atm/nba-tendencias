# Entrega controlada NBA Stat: preparada y desactivada

Se reutilizan el recolector privado, su cola cifrada, la capa NBA Stat del navegador y los gráficos existentes. No se crean repositorios, servicios, claves, contadores ni cron. Esta entrega de código **no consulta NBA Stat, no publica estadísticas y no habilita recepción ni sincronización**.

## Formato público mínimo

El productor genera exclusivamente bajo `public/data/nbastat/`:

- `games/<sha256>.json`: un partido finalizado, con ID nativo NBA Stat, fecha UTC ya revisada, temporada, competición, equipos/IDs nativos, marcador y revisión. Cada participante contiene ID/nombre NBA Stat, puntos, rebotes, asistencias, triples anotados/intentos, tiros de campo anotados/intentos, robos, tapones, pérdidas y minutos normalizados con la revisión semántica existente. Las ausencias son únicamente IDs: sin ceros de actuación ni motivos médicos/personales.
- `releases/<sha256>.json`: manifiesto inmutable de cada entrega.
- `manifest.json`: versión actual, generación creciente, atribución, lista completa de partidos y hashes. Una retirada exige IDs explícitos; los archivos antiguos permanecen para revertir.

No contiene IDs canónicos NBA/ESPN ni su tabla de cruce, nacimientos, evidencias, fichas de plantilla, estados de retirada, históricos del usuario, respuestas crudas, checkpoints cifrados, claves o credenciales. No se publican cuartos ni estadísticas de equipos que NBA Stat no ofrece. La atribución obligatoria está en el manifiesto y en la interfaz:

> Statistics sourced from NBA Stat and published with permission. NBA Stat is not affiliated with or endorsed by the NBA.

La autorización comunicada para datos NBA Stat no se extiende a archivos personales ni perfiles de NBA.com/ESPN. Los archivos públicos se construyen con listas cerradas de campos, no serializando el estado privado. La huella SHA-256 detecta corrupción e inconsistencias; no es una firma del proveedor. La procedencia se verifica en el recolector y la publicación se confía al repositorio y al operador autorizado.

## Productor privado y publicación

`preparePublicDeliveryFromStore` usa el adaptador cifrado existente en lectura. Requiere seleccionar IDs NBA Stat expresamente. Para un partido validado puede promover **una copia en memoria** con la función existente `incorporateSyncGame`, sin modificar el checkpoint para preparar la revisión. Antes de exportar vuelve a decodificar el cuerpo privado con su revisión semántica, reconstruye el lote con las correspondencias verificadas y compara el resultado. Se comprueban el digest de la descarga, identidad/participación completa, ausencia de bloqueos, equipos, marcador, correspondencia BDL y revisión vigente.

Se conserva ahora esa revisión semántica dentro de la partición cifrada del trabajo. Los checkpoints anteriores siguen siendo legibles. Si falta la revisión para publicar, se bloquea el exportador; basta revalidar el cuerpo ya guardado con la revisión comprobada, sin nueva petición. Los datos históricos del navegador no participan en este paso.

La preparación conserva los partidos previamente publicados y solo genera nuevos archivos de partidos modificados. Un trabajo bloqueado seleccionado detiene la preparación; no se sustituye una entrega completa por otra parcial. Las retiradas son explícitas, nunca consecuencia de que falte un partido en un calendario reducido.

`public-publisher.mjs` está conectado al plan validado. No toca el contador de consultas: solo habla con GitHub, cuando se autorice. Comprueba el repositorio público fijo y sus permisos, el SHA de `main` esperado, el manifiesto anterior y los archivos reutilizados. Crea un árbol basado en el anterior y un único commit que modifica exclusivamente las rutas permitidas. Actualiza `main` sin forzar: si cambia la rama durante la operación, se rechaza. Un fallo durante la subida no cambia la referencia pública ni deja una entrega parcial activa. Si se pierde la respuesta después de actualizar la referencia, hay que inspeccionar el commit/manifiesto antes de repetir; no se presupone que la operación falló ni se fuerza una escritura.

El productor exige `delivery.enabled: true`, autorización de publicación confirmada, lista explícita `delivery.approvedSourceIds`, confirmación `PUBLISH_REVIEWED_NBASTAT_RELEASE` y el SHA revisado de `main`. **La configuración sigue desactivada.** No se ha creado un workflow de publicación ni se ha ejecutado ninguna escritura remota de datos.

El comando preparado `node scripts/publish-reviewed-delivery.mjs --review` valida sin red un plan en la ruta ignorada `work/public-delivery/plan.json`. `--fixture-review` admite solo revisar muestras ficticias sin publicar. `--publish` permanece bloqueado por configuración y requiere un workflow manual del repositorio privado en `main`; solo entonces leería la credencial. No es posible publicar un plan marcado ficticio.

El `GITHUB_TOKEN` privado no concede acceso al público. Una futura ejecución puede usar el fine-grained PAT ya existente `NBA_QUOTA_PUBLIC_PAT` **si el usuario autoriza expresamente este uso adicional** y sus permisos permiten Contents read/write en el único repositorio público. No se ha leído, copiado ni cambiado ese secreto. También puede usarse una GitHub App de permisos equivalentes. No se necesitan permisos de administración ni credenciales NBA Stat para entregar un box score ya almacenado. El workflow manual y la clave persistente de producción del almacenamiento privado quedan para la autorización de la primera entrega; no se configuran aquí.

## Consumidor React y conservación del historial

En Datos aparece **NBA Stat · entrega pública preparada**. `PUBLIC_NBASTAT_DELIVERY_ENABLED` sigue en `false`: no hace ninguna petición de estadísticas al abrir la web y el botón de recepción está desactivado. El recolector tampoco se activa. Cuando se autorice, la comprobación inicial será manual desde ese botón, no un temporizador oculto.

El lector usa solo archivos estáticos del mismo origen, sin cookies ni credenciales. Descarga el manifiesto completo y únicamente los partidos nuevos/modificados. Verifica campos, IDs, puntos por equipo, ausencias, checksums y generación. Instala la entrega **solo después** de validar todos los archivos. Si falta un archivo, hay datos privados, un hash falla o llega una versión antigua/conflictiva, conserva la versión válida anterior con aviso. Tras varios días sin abrir la web basta el manifiesto actual completo; no depende de haber recibido cada entrega intermedia.

La caché vive en una base nueva `nba-tendencias-nbastat-public-feed`, con intercambio transaccional y control de revisión entre pestañas. Conserva versión activa y anterior. No abre para escritura las bases del historial, plantillas, directorio ni capa NBA Stat privada. Si la activa se corrompe, recupera la anterior y pausa recepción. Si no hay respaldo utilizable, ofrece reparar **solo** esa caché pública y descargar de nuevo cuando se habilite la recepción.

El consumidor transforma los IDs nativos usando las correspondencias NBA Stat que el usuario guardó localmente. Los 434 enlaces NBA/ESPN no son por sí solos enlaces NBA Stat. Si falta una correspondencia, la actuación queda pendiente: no inventa cero ni altera denominadores. Añadir un enlace reevalúa los datos ya recibidos sin descargar el partido otra vez. Un jugador trasladado conserva sus partidos anteriores por la identidad canónica existente. Los filtros, combinaciones, tendencias y restricciones de retirada siguen usando los mismos módulos.

Las actuaciones públicas y privadas se combinan en memoria con `prepareNbaStatGame`, `applyNbaStatGame` y `composeNbaStatView`. IDs estables y revisiones evitan duplicados. Revisiones incompatibles se retienen con aviso; una posible duplicidad con históricos de otra fuente también se bloquea. Si una corrección retira una participación, no se conserva como partido disputado mientras falte resolver el resto. Una retirada pública puede poner en cuarentena la copia NBA Stat de análisis, conservándola en su base privada. No se borra ningún registro original.

## Reversión y protección de Pages

- **Local:** «Volver a la versión anterior» intercambia las dos entregas de caché y pausa recepción, también tras recargar. Afecta solo a la capa pública; no reescribe históricos ni restaura/elimina importaciones privadas. Reanudar es explícito.
- **Publicación:** `preparePublicRollback` crea una generación nueva que referencia archivos antiguos comprobados y declara las retiradas. No fuerza Git ni borra datos del repositorio. Todos los partidos cuyo contenido o presencia cambie requieren aprobación de sus IDs.
- **Despliegue:** `npm run build` valida la carpeta pública antes de Vite. Rechaza muestras ficticias, campos privados, archivos ajenos/symlinks, referencias incompletas y hashes incorrectos en versión actual y archivos históricos. Hoy no existe ninguna entrega en esa carpeta: solo se publica código.

## Pruebas y primera entrega real

Las pruebas usan exclusivamente nombres, identificadores y estadísticas ficticios. El recorrido desde dos procesos y un Git local cifrado genera `work/integration-fixture/public-release.json` (ignorado, nunca `public/`). Se comprueban exportación sin datos privados, publicación GitHub simulada, permisos, carreras, interrupciones, integridad, recuperación, reversión y conservación de bases originales de prueba. Los tests de navegador prueban el hook React en un harness local y el DTO nativo con los gráficos reales de la app, muestras 5/10/15/20/100/200, PRA y porcentajes, escritorio/móvil. El harness no se incluye en el build.

Antes de autorizar el piloto 1369:

1. Resolver las correspondencias de los participantes y el enlace BDL ↔ NBA Stat con evidencia suficiente. Los nacimientos anunciados aún no se presuponen disponibles. No hemos recibido ni publicado la respuesta privada del usuario.
2. Recuperar/revalidar el box score ya descargado en el almacenamiento privado autorizado; revisar DNP, minutos, marcador y que no haya identidades pendientes. Preparar solo `sourceIds: ['1369']` y revisar el JSON público mínimo sin publicarlo.
3. Probar ese plan en una copia local de la app con correspondencias verificadas y comparar actuaciones concretas con la revisión privada, además de las pruebas ficticias. Confirmar que los históricos originales permanecen iguales y el nuevo partido cambia los gráficos como corresponde.
4. Autorizar una publicación manual, su credencial y el commit esperado. Preparar entonces el workflow manual, la configuración del productor para 1369 y la habilitación del consumidor. No habilitar cron ni consultas masivas como parte de esa autorización.
5. Tras Pages, verificar manifiesto/hashes, pulsar «Comprobar entrega publicada» y comprobar Cade y otros participantes en puntos, rebotes, asistencias, triples, PRA y últimos 5/10/15/20. Si falla, usar la reversión. Solo después se planteará automatizar la entrega.

No se ha verificado ni transferido un nuevo partido real en esta actualización. La conexión de código está preparada; las correspondencias reales, el piloto privado y la autorización/configuración manual de producción siguen pendientes.
