# Correspondencias privadas de partidos (sin API ni sincronización)

La correspondencia de un partido no verifica identidades de jugadores. Nunca se enlaza por nombres parecidos ni por números coincidentes entre proveedores.

## Evidencia del caso solicitado

El calendario publicado y revisado de BALLDONTLIE identifica `bdl:game:21717855`: Detroit local, Boston visitante, 121–113, 20 de octubre de 2026. La revisión privada y la comunicación de NBA Stat descritas por el usuario identifican su partido 1369, el mismo marcador y 35 filas (22 participantes y 13 ausencias). No hemos inspeccionado el archivo privado del usuario. Estos informes no sustituyen la comparación local de los campos originales.

Antes de aprobar faltan: comprobar los IDs internos de ambos equipos de NBA Stat con evidencias independientes, revisar el significado de `scheduled`, su zona horaria, los valores reales de temporada/estado y la procedencia del archivo descargado. No se presupone que el horario de un proveedor sea el del otro. Una discrepancia exige aclaración del proveedor, no copiar la hora de BALLDONTLIE. Las muestras sintéticas del repositorio no son evidencia del partido real.

## Uso en el navegador

1. En Datos, selecciona la revisión privada descifrada en el importador NBA Stat. No es necesario incorporar actuaciones.
2. En «Correspondencias de partidos», rellena el formulario «Preparar evidencias sin editar JSON» con las abreviaturas confirmadas, referencias privadas y año de inicio de temporada; pulsa «Preparar evidencias declaradas». Como alternativa reutilizable, selecciona un JSON privado de evidencias con el formato indicado debajo. Solo utiliza valores y referencias que hayas comprobado realmente. No incluyas contraseñas, tokens ni el contenido del correo.
3. Pulsa «Comprobar correspondencia sin guardar». Se comparan equipos por IDs revisados, temporada, estado final, marcador y el instante exacto de `scheduled` con zona explícita. No se interpreta una fecha sin zona. Si no hay un candidato único y coherente permanece pendiente.
4. Solo si la comprobación resulta elegible y has contrastado las referencias, confirma y guarda el enlace. Se trata de una revisión local con procedencia declarada: no de una firma o certificación del proveedor.
5. Exporta el registro para conservar una copia privada. El exportado contiene evidencia mínima del partido y referencias, no las actuaciones individuales. No lo subas a GitHub.

Formato **ilustrativo, no evidencia real**, para guardar privadamente como JSON. Sustituir todos los valores ficticios; los IDs de equipo deben proceder del proveedor y su relación con los equipos debe verificarse independientemente (respuesta identificada del proveedor, perfil oficial con ID explícito o correspondencia del proveedor).

```json
{
  "version": 1,
  "provenanceReference": "private-file:referencia-local-de-la-descarga-autenticada",
  "semanticsReference": "private-email:referencia-real-que-aclara-fecha-temporada-y-estado",
  "finalStatus": "VALOR_REAL_OBSERVADO_Y_VERIFICADO",
  "seasonValue": "VALOR_REAL_OBSERVADO_Y_VERIFICADO",
  "seasonYear": 2026,
  "competition": "NBA",
  "teams": [
    {"sourceId": "ID_INTERNO_REAL_LOCAL", "code": "DET", "reference": "private-email:confirmacion-explicita-del-ID-Detroit"},
    {"sourceId": "ID_INTERNO_REAL_VISITANTE", "code": "BOS", "reference": "private-email:confirmacion-explicita-del-ID-Boston"}
  ]
}
```

`seasonValue` y `finalStatus` conservan el tipo JSON y valor literal observados; no convertir números a texto. Una referencia escrita no prueba por sí sola su contenido: el usuario debe conservar y revisar la evidencia auténtica. Una respuesta con solo nombres de equipos no permite dar por probados sus IDs. La hora se toma exclusivamente del campo original `scheduled`, nunca del formulario que propone una hora del calendario.

## Bloqueos

- `TEAM_EVIDENCE_MISSING`: faltan correspondencias independientes de IDs de equipos.
- `INDEPENDENT_PROVENANCE_OR_SEMANTICS_MISSING`: falta procedencia o referencia de semántica.
- `STATUS_OR_SEASON_UNVERIFIED`: valores de estado/temporada no revisados.
- `SOURCE_TIMEZONE_UNRESOLVED`: `scheduled` no contiene un instante ISO con zona explícita.
- `BOXSCORE_INCONSISTENT`: inconsistencias detectadas por el decodificador.
- `NO_EXACT_CALENDAR_MATCH`: equipos, marcador, temporada, estado u hora no coinciden exactamente; revisar ambas fuentes. No es prueba de que sean partidos diferentes, pero bloquea la aprobación automática.
- `AMBIGUOUS_CALENDAR_MATCH` / `BATCH_ID_CONFLICT`: varios candidatos o IDs repetidos.

## Reutilización y recuperación

El módulo puro `game-links.js` es compartido con el recolector privado. `inspectGameLinkBatch` compara múltiples revisiones locales reutilizando evidencias de equipos y semántica, y detecta conflictos de IDs en ambos sentidos. Solo propone candidatos, sin aprobaciones automáticas. Cuando el proveedor entregue un índice/correspondencias explícitas se podrá alimentar este mismo límite de validación con lotes; no se ha supuesto ni consultado ningún endpoint nuevo.

El navegador guarda únicamente los enlaces en una base nueva `nba-tendencias-game-links`. No abre las bases históricas, plantillas, identidades ni estadísticas NBA Stat. Las transacciones rechazan conflictos de IDs incluso entre pestañas. El archivo privado original permanece solo en memoria del importador.

`validateGameLink` revalida los hechos contra el calendario actual antes de reutilizarlos; cambios en marcador, equipos, horario o temporada requieren nueva revisión. Un mero cambio de fecha de observación no invalida el enlace. `queueGameLink` prepara el formato de la cola, sin descargar ni modificarla; excluye enlaces ficticios. No está conectado a ningún proceso activo y no consume cuota.

Después de aprobar el partido, todavía se requieren correspondencias verificadas de **jugadores**, validación de participación/DNP y estadísticas. Un enlace de partido no resuelve los IDs de Cade ni del resto. La futura descarga seguirá usando la cuota compartida existente, nunca un contador nuevo. No se ha activado cron, entrega de estadísticas ni sincronización.
