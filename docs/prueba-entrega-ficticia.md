# Entrega y gráficos: prueba integral aislada

Esta actualización añade exclusivamente un receptor **de pruebas**, fixtures y comprobaciones. `src/data/nbastat/synthetic-delivery.js` es idéntico al del repositorio privado, no se importa en `main.jsx` ni se conecta a un fetch. El paquete ficticio se rechaza salvo `testMode: true` y no puede mezclarse con actualizaciones reales. No se añade ninguna base de datos ni ruta de usuario de producción.

## Qué se ha verificado

El privado genera un único partido nuevo ficticio con dos participantes y un DNP: calendario, cola, descarga HTTP simulada, validación real y persistencia cifrada real en Git **local**, seguida de recuperación por un segundo proceso Node desde otro clon. Las identidades y sus evidencias también son ficticias; no se confirma ninguna correspondencia pendiente de personas reales.

El JSON resultante viaja solo entre directorios `work/` locales ignorados por Git. No se incluye en `public/data`, `dist`, Pages ni un artefacto publicado. El nombre del contrato contiene `synthetic`, y el paquete conserva un aviso de no publicación.

Las pruebas del público usan ese mismo contrato. El historial base incluye un partido anterior ficticio, dos jugadores y sus dos registros de equipo, todos de prueba. Al combinar la actuación nueva:

- Jugador FICTICIO Alfa: puntos `[20, 12]`, en orden más reciente primero; nueva actuación de 24,5 minutos, 4 rebotes, 3 asistencias, 1 triple y PRA 27.
- Más de 19,5 puntos: de `0/1` antes a `1/2` después, es decir 50 %; últimos 5/10/15/20/100/200 muestran solo dos actuaciones disponibles.
- La ausencia no genera fila de jugador ni entra en denominadores. Los cuartos/totales de equipos nuevos quedan pendientes, sin inventarlos.
- La entrega repetida devuelve `DUPLICATE`; no crea más actuaciones. La misma revisión con datos incompatibles se rechaza.
- El historial base no se modifica; los registros y resúmenes de sus equipos permanecen iguales.

`tests/browser/synthetic-pipeline.cjs` abre la aplicación real en localhost y verifica sus gráficos Recharts, tabla, filtros, porcentajes e IndexedDB. Usa contextos efímeros nuevos en escritorio y móvil, bloquea toda red externa y no permite una URL pública. La entrega se aplica explícitamente desde el código de prueba; no hay un consumidor automático nuevo en la aplicación. Tras recargar y repetir la entrega compara las tres bases originales ficticias. No abre el navegador ni las bases personales del usuario.

## Reproducir (solo desarrollo local)

1. En el privado, ejecutar `npm ci --ignore-scripts`, `npm run check`, `npm test` y `npm run test:e2e:fixture`.
2. Copiar **únicamente el paquete ficticio recién generado** desde `nba-tendencias-private-sync/work/integration-fixture/delivery.json` a `nba-tendencias/work/integration-fixture/delivery.json`. No copiar checkpoints ni archivos personales. Ambos destinos están ignorados por Git.
3. En el público ejecutar `npm test`, `npm run build` y `npm run dev -- --port 5181`.
4. Con Playwright y Chromium disponibles, ejecutar `node tests/browser/synthetic-pipeline.cjs`. Se pueden indicar `PLAYWRIGHT_MODULE` y `CHROMIUM_PATH` si están instalados fuera del proyecto. `LOCAL_APP_URL` solo admite localhost/127.0.0.1. No se requiere ningún servicio de pago ni se añaden dependencias al bundle.

Las pruebas Node del receptor se incluyen en `npm test` y no necesitan ese archivo externo. La prueba de navegador usa el paquete producido efectivamente por el recorrido privado y se ejecutó localmente; no se presenta como un job de Playwright ya desplegado en Actions.

## Límites pendientes

La descarga, el calendario, el presupuesto en memoria y las identidades de esta prueba son simulados. La persistencia usa dos procesos y clones de un bare local, no el estado remoto GitHub. La entrega es un archivo local de fixture, no un publicador ni polling en producción. El contrato ficticio no autoriza entrega de estadísticas reales.

Faltan correspondencias reales NBA Stat/NBA/ESPN y de partidos, validaciones reales de nuevos box scores, conexión operativa al único ledger existente, persistencia/backup remoto y un canal autorizado de incrementos con recuperación/aplicación en el navegador. La sincronización real, cron y publicación de estadísticas siguen desactivados. Los 93.224 registros, 519 fichas, 434 identidades y retiradas personales no se copian ni modifican.
