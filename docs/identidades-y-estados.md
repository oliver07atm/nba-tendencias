# Correcciones locales de identidad y estado

Esta función no descarga estadísticas ni sustituye temporadas o plantillas. Mantiene un tercer almacén local, `nba-tendencias-player-directory` (versión 1, almacén `corrections`, clave `personal`). Las bases anteriores conservan sus nombres, versiones y contenidos.

## Uso sin programar

1. Guarda el JSON privado de correcciones entregado en la conversación.
2. Abre **Datos → Identidades y estados de jugadores → Importar correcciones de jugadores**. No lo importes como historial ni como plantilla.
3. Revisa los recuentos de identidades y estados y pulsa **Aplicar correcciones en este navegador**.
4. Abre un partido o el selector de jugadores. Las identidades enlazadas usan todos los registros originales disponibles, también de equipos anteriores.
5. Puedes exportar las correcciones y el informe, y llevarlos a otro navegador o a Archivos del iPhone. En el otro navegador debes tener importados también tus históricos y las plantillas.

Máximo 10 MB. El archivo se procesa localmente. Se combinan revisiones por ID y fecha; los archivos antiguos no deshacen una revisión posterior. Los conflictos de IDs o revisiones contradictorias se rechazan antes de guardar. Exporta tus correcciones si quieres conservar una copia externa.

## Tres diagnósticos diferentes

- **Historial vinculado:** el ID estable tiene registros importados que se pueden analizar. El informe cuenta esos partidos.
- **Identidad verificada, sin estadísticas importadas:** hay evidencia para enlazar NBA/ESPN, pero ese historial no contiene actuaciones de esa identidad. No se inventan ceros ni partidos.
- **Identidad pendiente:** falta una correspondencia fiable. No se afirma que el jugador carezca de estadísticas. Los nombres solo ayudan a investigar candidatos; nunca crean un enlace automático.

El informe se calcula sobre el historial personal guardado, incluso si está activa la demostración. El JSON exportado incluye el diagnóstico de cada jugador de las plantillas. Las cifras dependen de los archivos que tenga cada navegador. La verificación de identidad no certifica la exactitud de las estadísticas históricas.

## Estados independientes

`active` (activo), `retired` (retirado confirmado) y `unknown` (desconocido). Si no hay revisión aplicable, se usa desconocido. La ausencia de un equipo o una temporada nunca declara una retirada. Una retirada de camiseta, un DNP o una lesión tampoco bastan para determinarla.

La revisión requiere identidad estable, fecha y evidencia NBA.com/ESPN. El formulario exige declarar que la fuente corresponde a la persona y acredita el estado. Importar JSON valida el formato y el dominio de la fuente, pero **no autentica su contenido remotamente**. Los archivos con revisiones futuras no ocultan jugadores antes de esa fecha.

Solo una retirada confirmada excluye del selector de análisis individual y de las tendencias individuales. Los enlaces directos a su análisis muestran un aviso; desde el partido, su tarjeta histórica permanece identificada y sin botón habilitado. El estado puede corregirse a activo o desconocido con una revisión posterior, conservando las estadísticas. El panel de administración permite seleccionar retirados para actualizar su estado: no es el selector de gráficos.

## Conservación de resultados

Las correspondencias crean una vista de lectura con IDs canónicos. No reescriben registros originales ni exportaciones de temporadas. La ocultación se aplica a opciones de interfaz y grupos de tendencias individuales; los registros enviados al motor no se filtran por retirada. Las entidades de equipo usan todos sus registros originales, sin reconstruir los marcadores sumando jugadores visibles.

Las pruebas comparan resultados completos de tendencias de equipos, incluidos porcentajes, antes y después de ocultar retirados. También comprueban cuartos/mitades, invariancia de registros y persistencia de las bases anteriores, homónimos, conflictos, reactivaciones y cronología. Las pruebas con archivos personales de investigación se ejecutan en bases aisladas y esos archivos quedan en `work/`, ignorado por Git.

## Formato de correcciones

```json
{
  "version": 1,
  "type": "nba-player-corrections",
  "identities": [],
  "statuses": []
}
```

Cada identidad contiene `nba`, `espn`, `name`, `birthDate`, `checkedAt`, `nbaUrl` y `espnUrl`. Ambos perfiles deben acreditar la misma persona y fecha de nacimiento. Cada estado contiene `key` (`nba:player:ID` o `espn:player:ID`), `name`, `state`, `checkedAt`, `evidenceUrl` y, opcionalmente, `note`. No se importan registros estadísticos en este formato.

La revisión preparada y sus fuentes se entregan como archivo privado separado del código. No se publican esos archivos en GitHub ni se activa una API de pago o una extracción automática nueva. El calendario de BALLDONTLIE y las actualizaciones de estadísticas individuales desactivadas mantienen su configuración anterior.
