# Primer partido: enlace local, sin nuevas consultas

El usuario dispone del box score privado NBA Stat 1369 (Detroit 121–Boston 113, 20/10/2026, 22 participantes y 13 DNP). El calendario publicado identifica BALLDONTLIE 21717855 con esos equipos, roles, fecha y marcador. **No tenemos el archivo privado del usuario: el código no demuestra que sus campos tengan esos valores hasta comprobarlos en su navegador.**

## Procedimiento corto en Datos

1. Activa el historial personal y selecciona el archivo descifrado `nbastat-private-review.json` en el importador existente. No se sube ni se consulta ninguna API.
2. En «Correspondencias de partidos», revisa el resumen extraído de los campos originales `data.game.home_team_id`, `away_team_id` y de todas las filas `data.players[].team_id` / `team_name`. Para el caso comunicado esperamos local **34 → Detroit Pistons (18 filas)** y visitante **7 → Boston Celtics (17 filas)**. Son valores por comprobar, no una tabla preaprobada. Pulsa «Usar consenso exacto de equipos del archivo (propuesta)» solo si el resumen es correcto.
3. Si `game_date` es literalmente `2026-10-20` y has comprobado que representa la fecha declarada del partido, marca la vía de fecha declarada. No necesitas afirmar una zona horaria que NBA Stat no ha indicado. Introduce referencias privadas a la descarga autenticada y a los campos/documentación ya disponibles que acreditan fecha, temporada y estado. No es necesario escribir otro correo. Una referencia inventada no es evidencia; conserva el archivo original.
4. Prepara las evidencias y pulsa «Comprobar correspondencia sin guardar». El enlace debe ser único en el calendario disponible: equipos, local/visitante, fecha declarada de ambos proveedores, temporada, competición, estado final y marcador. Se exige consistencia del box score. Dos encuentros para la misma pareja/fecha/temporada bloquean la vía, aunque solo un marcador coincida. Fechas ausentes, imposibles o con hora en `game_date` quedan pendientes: no se recortan ni reinterpretan.
5. Revisa el candidato `bdl:game:21717855 ↔ 1369`, confirma únicamente evidencias auténticas y guarda. **Elegible es una propuesta; guardado revisado es una aprobación local con procedencia declarada, no una certificación criptográfica del proveedor.** Exporta el registro si quieres copia privada. En visitas posteriores selecciona el mismo archivo y pulsa «Reutilizar enlace revisado».
6. El enlace alimenta directamente la vista previa del importador existente. Confirma por separado los valores de participación/minutos ya revisados para 1369. La hora del calendario BALLDONTLIE se usa como referencia para ordenar y mostrar el partido; **no se convierte en una hora UTC atribuida a NBA Stat**. `scheduled` queda intacto en la evidencia privada.
7. Revisa cuántos participantes tienen identidad vinculada antes de incorporar nada. El importador local solo permite actuaciones validadas y vinculadas; puede incorporar un subconjunto y completar después sin duplicar. No es necesario publicar estadísticas ni habilitar la recepción pública para esta prueba privada.

## Alcance de las evidencias

Un nombre completo y exacto de franquicia, asociado al mismo ID en todas sus filas, junto con el rol local/visitante del partido y sumas de puntos coherentes, permite revisar una correspondencia **de equipo** a partir de la propia respuesta primaria. No se usan números coincidentes de otros proveedores, abreviaturas adivinadas ni nombres parecidos. Un nombre contradictorio o no reconocido bloquea este método. No se supone ningún campo de nombre de equipo en `data.game` cuyo nombre JSON no se haya observado.

La fecha declarada se compara con **`sourceDate`** de BALLDONTLIE, no con el día convertido a Canarias. El método tradicional de instante exacto con zona explícita sigue disponible y es el predeterminado para evidencias anteriores. La unicidad se comprueba dentro del calendario disponible; no demuestra que un calendario incompleto contenga toda la temporada. Un cambio posterior de fecha, marcador, equipos o temporada invalida el enlace y exige revisión. El código no repara discrepancias eligiendo otra zona horaria.

## Qué sigue bloqueando a los jugadores

El enlace del partido y los dos enlaces de equipo **no acreditan** NBA Stat player ID → NBA/ESPN. El mismo archivo no contiene, según lo comunicado, nacimientos u otros identificadores externos suficientes. Nombre y equipo solo generan candidatos, nunca aprobaciones. No se cuentan las 13 ausencias como actuaciones ni como identidades necesarias para incorporar las 22 actuaciones reales.

Para cada participante pendiente se necesita evidencia de identidad suficiente: por ejemplo, nombre compatible y fecha de nacimiento observada en NBA Stat, coincidente con el nacimiento canónico ya verificado, sin candidatos ambiguos ni contradicciones. El motor existente está preparado para esos campos cuando estén realmente disponibles; no los inventa ni obliga a reimportar históricos. Quienes carezcan además de nacimiento canónico seguirán necesitando esa comprobación. Si NBA Stat no aporta ese dato ni otro identificador contrastable, no podemos garantizar resolver los 22 con este box score solamente.

Una correspondencia revisada se reutiliza por ID estable en partidos futuros, conservando los encuentros de equipos anteriores. Los DNP permanecen separados. No se generan cuartos ni estadísticas de equipo que no ofrece el proveedor. Los registros originales, plantillas, retiradas y correcciones anteriores permanecen intactos.

## Compatibilidad y seguridad

`inspectGameLink`, `validateGameLink`, los lotes y el ciclo del recolector reutilizan la misma validación. `sourceDate` se conserva en las nuevas instantáneas de cola; las antiguas sin este campo no se inventan y requerirán refresco del calendario antes de usar esta vía. No se ha activado ningún proceso ni alterado la cuota compartida.

Los enlaces se guardan únicamente en `nba-tendencias-game-links`. Las actuaciones privadas siguen en su capa NBA Stat independiente. No se escriben históricos personales ni se publican evidencias, fechas de nacimiento, archivos del usuario o estadísticas. Las pruebas usan solo datos ficticios.

Bloqueos principales: `SOURCE_TEAM_ROWS_UNRESOLVED`, `TEAM_EVIDENCE_MISSING`, `SOURCE_DECLARED_DATE_UNVERIFIED`, `CALENDAR_DECLARED_DATE_MISSING`, `AMBIGUOUS_DECLARED_DATE`, `STATUS_OR_SEASON_UNVERIFIED`, `BOXSCORE_INCONSISTENT`, `NO_EXACT_CALENDAR_MATCH`, `BATCH_ID_CONFLICT`. La vía tradicional conserva `SOURCE_TIMEZONE_UNRESOLVED` cuando falta zona explícita.
