# NBA Stat: cola incremental preparada, sin activar

Estado: 22/10/2026. **No se han realizado consultas NBA Stat, añadido cron, ejecutables de sincronización ni publicación de estadísticas.** La configuración sigue con `enabled: false` y esquema sin verificar. La aplicación y sus tres bases originales no importan el worker nuevo.

## Qué se ha implementado

`src/data/nbastat/sync-queue.js` es una máquina de estados pura reutilizable por un futuro recolector. Su temporada por defecto es **2026-27**. Consume el calendario normalizado **completo** de BALLDONTLIE que ya descargamos, sin limitarse a los próximos catorce días. No vuelve a consultar BALLDONTLIE ni NBA Stat por sí misma.

| Estado interno | Significado |
| --- | --- |
| `pending` | Partido pendiente, en juego o con temporada sin confirmar; aún no descargable |
| `finalized` | Calendario finalizado, correspondencia de partido revisada y descarga/revisión pendiente |
| `blocked-game-link` | Final conocido, pero falta el ID NBA Stat revisado o una referencia completa |
| `downloaded` | Respuesta conservada en caché privada; todavía no validada |
| `blocked-validation` | Semántica sin revisar, DNP/minutos/campos incoherentes u otro fallo de calidad |
| `blocked-identities` | Datos del partido revisados, pero faltan correspondencias fiables de participantes |
| `validated` | Partido coherente y participantes vinculados; listo para la capa independiente |
| `incorporated` | Incorporado a la capa aislada del recolector, **no entregado ni publicado en la web** |

La cuota agotada no transforma un partido en completado: conserva su fase y una fecha `notBefore`. Las retenciones `hold` separan aplazamientos, estado aún no final y datos de referencia incompletos. Un encuentro marcado erróneamente como final en una fecha futura no consume consultas antes de esa fecha.

No hay una interfaz nueva de la cola en Datos ni una tarea que la ejecute en segundo plano. Los estados se prueban internamente; la importación privada existente sigue funcionando como antes.

## Identidad de partidos y recuperación de atrasados

La clave de seguimiento es el ID estable `bdl:game:…`. Un ID BDL no se reutiliza como ID NBA Stat. Se exige una correspondencia revisada con ambos IDs, evidencia NBA Stat, temporada, equipos local/visitante, competición y fecha compatible en Canarias. Un partido NBA Stat no puede quedar asignado a dos partidos BDL. No se enlazan por nombres ni por igualdad de números entre proveedores.

El calendario se reconcilia por IDs y conserva todos los trabajos anteriores aunque una descarga posterior sea parcial, omita meses o no incluya un partido. Se ignoran snapshots anteriores y observaciones antiguas por encuentro. Los partidos pendientes pasan a finalizados cuando cambie su estado; los aplazados quedan retenidos. Las fechas se comparan usando `Atlantic/Canary`, reutilizando el código existente.

Cambios de marcador, fecha, equipos o competición invalidan la validación preparada. Una referencia de equipo/fecha incompatible exige revisar de nuevo el enlace del partido. La última capa válida se conserva mientras se revisa la corrección: no se borra ni se pisa con un lote incompleto o fallido. Los cambios de participación o resultados exigen datos y reglas revisadas; no se inventan ceros ni se eliminan estadísticas al desaparecer de una respuesta parcial.

## Descargas y cuota compartida

`scripts/lib/nbastat/sync-worker.mjs` ofrece una pasada de **un partido**. No es un comando ejecutable ni se importa desde la app o workflows. Exige configuración de ingestión habilitada y esquema verificado, un transporte de servidor pasado explícitamente y almacenamiento durable. Con la configuración publicada devuelve desactivado antes de pedir datos. Las pruebas pasan exclusivamente funciones HTTP simuladas.

La descarga utiliza `createNbaStatClient`, **el mismo control de cuota** de perfiles, listas y pruebas anteriores. El integrador futuro debe suministrar `githubQuotaStore()` y el mismo grupo de concurrencia `nbastat-account-quota`; no otro ledger recién creado. Los secretos solo se pasan en memoria del servidor. Nunca se guardan en la cola ni se imprimen respuestas/cuerpos de error.

- Reserva durable antes de cada HTTP, incluyendo fallos y timeouts.
- Diez consultas como máximo por ventana móvil de sesenta minutos, compartidas entre todos los endpoints y pruebas.
- Sin cuota se aplaza el trabajo sin enviar HTTP; no duerme una hora consumiendo tiempo de Actions.
- Un 429 conserva el bloqueo persistente y respeta `Retry-After`, incluso si supera una hora. No hay reintento inmediato.
- Errores de red/HTTP dejan el trabajo pendiente con espera progresiva, sin borrar las descargas o revisiones anteriores.
- Un fallo de persistencia de la reserva impide la petición. Una caída después de HTTP puede provocar otra descarga posterior, pero la reserva consumida se mantiene y los IDs estables impiden duplicar actuaciones.
- El lock del estado privado impide dos workers simultáneos sobre el mismo estado; el ledger compartido y su protección existente siguen controlando los demás consumidores. No se puede observar el consumo de clientes externos de la misma cuenta: deben estar detenidos o integrados en ese presupuesto.

Los trabajos descargables más antiguos tienen prioridad. Los bloqueados por identidad no vuelven a descargarse automáticamente. La caché permite revalidarlos cuando lleguen nuevas correspondencias, sin consumir cuota. Una corrección posterior se solicita sobre la misma clave y con `notBefore`, sin duplicar el partido.

## Calidad y separación del historial

La validación vuelve a usar el decoder real, el acta de semántica por partido, las correspondencias revisadas y `prepareNbaStatGame`. No se extienden los valores ACTIVE/1, INACTIVE/0 o MM:SS de 1369 a otros partidos sin evidencia. Un perfil o estado desconocido queda bloqueado. Se contrastan ID NBA Stat, temporada, equipos, competición, día local y ambos marcadores con el calendario.

Se conservan las validaciones de tiros, puntos, rebotes, minutos y DNP. Las ausencias y sus motivos quedan separadas de las actuaciones y de los denominadores. El camino automático exige todas las identidades de quienes participaron; **no relaja ese control para aparentar un lote completo**. La importación manual existente conserva su opción explícita de incorporar solo los vinculados.

No se enlaza por nombres, no se cambian retiradas o pertenencias de plantilla, y las nuevas actuaciones mantienen los partidos del jugador con equipos anteriores. Si faltan equipos/cuartos, el lote queda con `teamPending`; no se producen registros de equipos mediante sumas inventadas. Las correcciones válidas reemplazan únicamente el partido de la capa NBA Stat, mediante los IDs existentes. Repeticiones no duplican filas; revisiones más antiguas no pisan las nuevas.

El estado del worker tiene `delivery: not-published`. «Incorporado» significa guardado en **esa capa aislada**, no escrito en IndexedDB del usuario. Los 93.224 registros originales, 519 fichas, 434 identidades NBA/ESPN y retiradas no se abren ni modifican. El mecanismo existente de vista combinada mantiene además la retención por posibles duplicados con otras fuentes cuando la entrega llegue al navegador.

## Persistencia privada y recuperación cifrada

`scripts/lib/nbastat/sync-store.mjs` guarda bajo `work/nbastat-sync/`, excluido de Git: directorio `0700`, archivo `0600`, sustitución atómica y revisión local con control de conflictos. Conserva trabajos, respuestas privadas, motivos, diagnósticos y la capa normalizada. Verifica el digest SHA-256 de cada respuesta al recuperar el estado y rechaza datos dañados. No escribe en `public/`, `dist/`, las bases del navegador ni el repositorio. Un lock huérfano requiere revisión; no se elimina automáticamente mientras pueda haber otro proceso.

Este archivo **sobrevive a reinicios de procesos en el mismo disco**, pero **no basta para persistir entre runners efímeros de Actions**. Para Actions se ha preparado además el adaptador opcional descrito abajo. Antes de activar un workflow debe conectarse y verificarse su uso real, con exclusión entre ejecuciones y una política de recuperación/conservación suficiente para días o semanas sin actividad. No se presenta esa parte como desplegada.

Ya existen funciones para sellar/abrir checkpoints con el cifrado autenticado usado en las pruebas privadas y restaurarlos en una ubicación vacía. No se suben a ningún sitio automáticamente. Una restauración no sobreescribe un estado existente ni restaura/reinicia el ledger de cuota, que permanece independiente. La clave de cifrado nunca se incluye en el checkpoint. Cambiar o perder la copia privada no permite reiniciar el presupuesto de API.

### Adaptador cifrado opcional para Actions (sin conectar)

`scripts/lib/nbastat/github-sync-store.mjs` prepara un canal sin otro servicio de pago: una rama por temporada, `nbastat-sync-private-2026`, que contendría **exclusivamente el checkpoint cifrado autenticado**, nunca respuestas o estadísticas legibles, credenciales o claves de cifrado. No se ha creado ni escrito esa rama ni se ha subido ningún checkpoint. Sus operaciones Git solo se han probado con dobles de prueba o repositorios locales ficticios, sin acceso a NBA Stat.

Un runner nuevo puede recuperar el checkpoint, descifrarlo solo en memoria y continuar por IDs. El adaptador incrementa la revisión y publica mediante comparación del commit anterior; una carrera no pisa otro estado. Rama ausente, clave incorrecta o estado corrupto detienen la recuperación: **no reinician silenciosamente la cola**. La primera inicialización requiere una opción explícita, que debe retirarse en las ejecuciones normales. La rama de cuota existente sigue siendo independiente y no se restaura desde este checkpoint.

El cifrado debe usar una contraseña fuerte de un secreto seguro, independiente del token API, sin introducirla en código, navegador o logs. Incluso cifrado, el estado requiere una política de acceso y conservación de claves y backups. El adaptador actual sella un checkpoint completo: antes de usarlo para toda la temporada hay que probar volumen y definir particionado/retención, ya que sucesivos cifrados completos no aprovechan deltas y pueden hacer crecer el historial Git. No se ha medido ni prometido capacidad ilimitada. La elección/activación de este canal no se ha realizado en esta actualización. Ningún workflow actual importa este adaptador; no existe un upload ni una publicación de datos privados programada. Es una implementación preparada para revisar antes de activarla, no un almacén nuevo ya en funcionamiento.

## Qué falta antes de activar 2026-27

1. Recibir y verificar las correspondencias NBA Stat → NBA/ESPN y los enlaces entre partidos BDL/NBA Stat. El calendario ya alimenta la cola, pero no proporciona por sí solo IDs de partidos del otro proveedor. La búsqueda/correspondencia automática de juegos aún debe implementarse y validarse; los candidatos ambiguos no se aceptarán automáticamente.
2. Verificar los campos y semánticas del box score para los tipos de partido que vayamos a procesar, y revisar sus perfiles de validación. La única revisión comunicada del 1369 no constituye una regla universal.
3. Aprobar y conectar la persistencia cifrada entre ejecuciones de Actions; probar el adaptador preparado en ese entorno y la recuperación de checkpoints, conflictos y disponibilidad tras ausencias largas.
4. Añadir el orquestador operativo, con pasadas cortas, recuperación de fechas pendientes y comprobaciones posteriores a finales para correcciones. Solo entonces habilitar un workflow: **no se ha añadido ahora ninguna programación**.
5. Superar las comprobaciones de calidad/procedencia y conectar el manifiesto público de incrementos autorizado, atribución y checkpoint del navegador. Actions podrá recolectar con la web cerrada; IndexedDB y los gráficos solo se actualizarán al abrirla y aplicar las revisiones.
6. Resolver cobertura real de equipos/cuartos antes de ofrecer actualizaciones de esos indicadores.

Con más de diez box scores, más descubrimiento o perfiles, harán falta varias ventanas de cuota. No se promete incorporación instantánea de una jornada completa. El diseño conserva los trabajos pendientes en vez de descartarlos para cumplir ese límite.

Atribución que debe acompañar los datos al mostrarlos o entregarlos:

> Statistics sourced from NBA Stat and published with permission. NBA Stat is not affiliated with or endorsed by the NBA.

## Pruebas

`tests/nbastat-sync-queue.test.js` utiliza calendarios, identidades y respuestas **FICTICIAS**, con fechas de fixture y funciones HTTP simuladas. Cubre estados, calendario completo, atrasados/omisiones, aplazados, enlaces revisados, bloqueo de identidades, revalidación local sin HTTP, DNP/minutos incoherentes, marcadores, series 5/10/15/20, revisiones e idempotencia, diez consultas compartidas con otros endpoints, cuota aplazada, 429, caída de red/disco, concurrencia, persistencia, corrupción y restauración cifrada. No acredita datos reales nuevos ni consume consultas NBA Stat.
