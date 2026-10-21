# Importar la muestra privada NBA Stat en NBA Tendencias

Esta es una **prueba de importación local**, no la sincronización automática de la temporada. La web no consulta NBA Stat ni envía tus archivos a servidores. No necesitas el token API ni la contraseña de cifrado en el navegador. Conserva tu JSON original en el ordenador.

## Uso sin programar

1. Abre NBA Tendencias y activa tu historial personal. En **Datos**, busca **NBA Stat · importar partido privado**.
2. Pulsa **Seleccionar revisión privada NBA Stat** y elige `nbastat-private-review.json`, ya descifrado. Máximo 10 MB. No selecciones `review.sealed.json` ni las temporadas históricas.
3. Revisa la fecha, `scheduled`, temporada y estado que aparecen. Introduce la fecha/hora **UTC** con formato `AAAA-MM-DDTHH:mm:ssZ`, sin inventar una zona para una hora ambigua. Si el calendario publicado contiene un único Boston–Detroit compatible, el botón propone su hora UTC; debes contrastarla antes de confirmar. La fecha de Canarias puede diferir de la fecha NBA estadounidense y respeta el horario estacional.
4. Marca la revisión del partido únicamente después de comprobar los campos mostrados. Para este caso se exige **1369, Detroit local 121–Boston visitante 113, 35 registros: 11 participantes ACTIVE/1 por equipo, 13 ausencias INACTIVE/0 con motivo, minutos MM:SS para participantes y null o vacío para ausencias**. Estos criterios proceden de la revisión privada comunicada por el usuario, no son reglas generales de todos los partidos NBA Stat.
5. La vista previa muestra los 35 jugadores, estadísticas, equipo, participación y correspondencias. **Ausencia** no genera un partido a cero. **Identidad pendiente** no significa que el jugador carezca de historial.
6. En **Correspondencias de identidad independientes**, selecciona el ID NBA Stat del archivo y la identidad NBA/ESPN de tus plantillas o históricos. **No selecciones solo por coincidencia de nombres**: contrasta los IDs, sus perfiles y la fecha de nacimiento en ambas fuentes; introduce las fechas y marca la confirmación. El ID NBA Stat es independiente de los números NBA/ESPN. Si no hay evidencia suficiente, deja pendiente la identidad. No abras una API con una clave en el navegador ni hagas consultas adicionales para completar la prueba sin planificar la cuota. La referencia NBA Stat enlazada puede requerir acceso del proveedor y no incorpora credenciales.
7. Pulsa **Preparar correspondencia verificada**. Puedes preparar varias, o usar **Importar correspondencias NBA Stat** si ya tienes un archivo revisado exportado desde esta herramienta. **Guardar correspondencias localmente** conserva únicamente esos enlaces en la nueva base NBA Stat; no cambia las 434 identidades anteriores. Si el nacimiento contradice una identidad NBA/ESPN ya revisada, se rechaza.
8. Pulsa **Incorporar actuaciones validadas y vinculadas**. Se permite incorporar solo las identidades verificadas y dejar las demás pendientes, **después** de validar la coherencia del partido entero. Si ninguna identidad está vinculada, el botón no se habilita. No se inventan vínculos para desbloquearlo.
9. En **Actuaciones guardadas · abrir gráficos**, pulsa un jugador. Sus nuevas actuaciones se combinan cronológicamente con todos sus partidos anteriores, incluidos los disputados con otros equipos. Los gráficos y tendencias conservan sus filtros y ventanas de 5/10/15/20 o mayores. Quita un filtro de temporada, local/visitante o rival que excluya el nuevo partido si no lo ves. Las retiradas confirmadas siguen ocultando la consulta individual y las tendencias del jugador; sus aportaciones históricas no se eliminan.

No es necesario volver a importar las tres temporadas. Tampoco hace falta volver a consultar el box score para añadir correspondencias: selecciona otra vez el mismo JSON privado y prepara más enlaces. **La misma muestra puede incorporar después las actuaciones antes pendientes**, sin duplicar las que ya estaban guardadas. Puedes exportar las correspondencias como copia privada; no las publiques.

## Qué se valida y qué no se puede afirmar todavía

La aplicación vuelve a calcular todo desde `raw` y `receivedAt`: no confía en los resultados `decoded`, `referenceChecks`, listas de candidatos o correspondencias precalculadas dentro del paquete. Rechaza campos de credenciales. Valida IDs, estructura, números, tiros/intentos, puntos frente a libres/tiros, rebotes, suma de puntos por equipo, equipos del partido, duplicados y formato de minutos. No transforma campos ausentes en ceros. Los valores no revisados de participación, estado o minutos dejan el lote bloqueado con un diagnóstico.

Conserva las ausencias y sus motivos/descripciones por separado. Nunca entran en los registros que alimentan los denominadores. Las actuaciones sin correspondencia tampoco entran todavía en las series. Por tanto, un historial individual puede seguir incompleto hasta que se resuelva su identidad; no se presenta ese vacío como ausencia o cero.

La existencia de URLs y fechas de nacimiento en un formulario/JSON no autentica el contenido de la fuente: son **evidencias revisadas y declaradas por la persona que importa**. En esta actualización no se han visto los IDs NBA Stat del archivo del usuario ni se ha verificado ninguna correspondencia nueva por consulta externa. Las 434 identidades NBA/ESPN no equivalen automáticamente a 434 correspondencias NBA Stat. Si no hay nacimiento o evidencia disponible en el proveedor, ese cruce requiere otra evidencia fiable y una revisión del mecanismo; no se salta la validación actual.

No se calculan registros de equipos sumando jugadores. **No hay cuartos ni box score completo de equipos en esta muestra**. El equipo continúa con sus históricos originales. La atribución se muestra en el panel y, si existe una capa NBA Stat activa, en las vistas de análisis:

> Statistics sourced from NBA Stat and published with permission. NBA Stat is not affiliated with or endorsed by the NBA.

## Guardado, revisiones y protección del historial

La aplicación guarda solamente las actuaciones normalizadas vinculadas, IDs pendientes, motivos de ausencia y correspondencias revisadas en **`nba-tendencias-nbastat-private`**. No guarda el cuerpo crudo ni credenciales. El JSON seleccionado permanece en memoria para la vista previa hasta salir o cerrar la página. No se escribe en las bases del historial original, plantillas o directorio. No se mezclan actuaciones ficticias y reales: los fixtures de pruebas llevan `synthetic: true` y etiquetas FICTICIO/DEMOSTRACIÓN.

La vista combinada aplica las correspondencias NBA/ESPN existentes solo para lectura. Se usan IDs `nbastat:game:1369:player:ID_INTERNO`. Repetir exactamente una muestra no añade registros. Una nueva recepción posterior puede reemplazar la revisión del partido, conservando los IDs. Una recepción más antigua no pisa una posterior. Se rechazan estadísticas diferentes con la misma hora de recepción; la única excepción es añadir identidades antes pendientes, sin cambiar las actuaciones ya vinculadas ni las ausencias. Una correspondencia ausente no puede borrar una actuación antes vinculada. Si la corrección cambia el marcador o los criterios revisados de participación de 1369, requiere una nueva revisión y no pasa silenciosamente.

El guardado usa una transacción con revisión local: una pestaña desactualizada no sobrescribe otra. Ante conflicto, recarga la página antes de importar de nuevo. La demostración conserva su funcionamiento y suspende la capa NBA Stat. Los posibles duplicados con un partido de otra fuente quedan retenidos, con aviso, en lugar de sumarse dos veces.

## De esta prueba a la automatización

Se comparten el mismo decodificador puro, contrato normalizado, validador, correspondencias y actualización por IDs que utilizará el recolector. El transporte autenticado permanece exclusivamente en los scripts de servidor; el bundle de navegador no incluye ese cliente, los secretos ni código de autenticación.

Queda por hacer antes de automatizar toda 2026-27:

- Verificar las correspondencias NBA Stat de los participantes, empezando por los del archivo privado. No enlazar por nombre ni trasladar la plantilla a las actuaciones.
- Validar semánticas, estados, DNP, fechas, minutos y completitud en más partidos, con perfiles por caso o reglas generales realmente comprobadas. No extender automáticamente los valores observados en 1369.
- Añadir descubrimiento/paginación, cola durable de pendientes y revisiones posteriores, con un único presupuesto de **10 consultas por ventana móvil de 60 minutos**, compartido por todos los endpoints y workflows de la cuenta. El control persistente y las pruebas manuales existentes siguen intactos.
- Probar calidad y procedencia antes de habilitar manifiestos/JSON públicos autorizados, checkpoints y recuperación de días pendientes. El navegador aplicará incrementos a esta capa separada cuando se abra; Actions podrá recolectar con el navegador cerrado.
- Mantener explícita la falta de estadísticas de equipos/cuartos hasta contar con datos reales adecuados.

No se ha activado cron para actuaciones, sincronización masiva, publicación de estadísticas o servicio de pago. Esta importación manual es el ensayo inicial; no sustituye al objetivo de actualización automática.
