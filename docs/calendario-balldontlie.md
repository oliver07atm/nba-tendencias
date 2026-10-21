# Calendario real con BALLDONTLIE · 0 €

## Uso sin programar

Abre **Partidos**: por defecto aparece el **calendario mensual** del mes actual en Canarias y las tarjetas correspondientes. Usa **Mes anterior / Mes siguiente**, el campo **Mes** o **Fecha en Canarias**. Pulsa un día para ver sus encuentros. **Hoy** selecciona el día actual y **Ver todo el mes** vuelve a la lista mensual.

Filtra por cualquiera de los **30 equipos** y por estado: pendiente, en juego, finalizado, aplazado y otros estados que comunique la fuente. Los recuentos del calendario mensual respetan estos filtros. **Quitar filtros de equipo y estado** los limpia. Para la vista anterior, elige **Solo tarjetas → Hoy y próximos 14 días**. También puedes consultar **Todas las fechas descargadas**. Las tarjetas se paginan de 30 en 30; cambiar fecha/equipo/estado restablece la página. La URL conserva mes, fecha, filtros y página al abrir un partido y volver.

La línea **Cobertura real descargada** indica las fechas extremas y el número de encuentros realmente disponibles. La revisión del listado publicado de la temporada no garantiza que la NBA o el proveedor hayan anunciado todos los cruces futuros. NBA Cup, play-in y playoffs se incorporan únicamente cuando la API los publica con ambos equipos identificados. Un día sin encuentros descargados no demuestra que no haya partidos, especialmente con filtros activos o sin hora confirmada.

Cada tarjeta muestra visitante, local, hora de Canarias y estado comunicado por la fuente. Los horarios usan `Atlantic/Canary`, incluido el cambio de hora. Si la API no proporciona una fecha y hora inequívocas con zona, se muestra **Hora por confirmar**; la fecha de origen no garantiza el día exacto en Canarias. No se inventan horas, encuentros ni alineaciones. Los partidos aplazados conservan la fecha que devuelve la fuente hasta que esta cambie.

Abre un partido para consultar sus equipos. Por defecto se muestran **dos listados abiertos por equipo**: «Plantilla actual», con pertenencias confirmadas, y «Otros jugadores con estadísticas históricas», con asociaciones sin confirmar y revisiones antiguas. La confirmación de pertenencias depende de las fuentes y fechas de las plantillas privadas; no se oculta el acceso al historial. Las tendencias de jugadores utilizan las plantillas privadas importadas y sus correspondencias revisadas; no acreditan disponibilidad para el partido. Consulta la [actualización de plantillas y navegación](plantillas-y-navegacion.md). El botón **Ver tendencias de este partido** admite cualquier fecha futura descargada, más allá de 14 días, también con estados sin confirmar que deben interpretarse con cautela. Al abrir un jugador se conserva su historial disponible entre equipos y temporadas, con los filtros existentes.

El calendario real nunca se combina con estadísticas de demostración. Si estás usando la demo, activa tu historial desde **Datos → Usar mi historial**, o desde el partido, para analizarlo. Sin historial se muestra el calendario igualmente. La demostración de estadísticas sigue disponible; su calendario ficticio se abre expresamente con **Ver calendario de demostración**.

## Separación y privacidad

- `public/data/schedule.json` es exclusivamente calendario público; no contiene `records`, jugadores o claves. En `main` se incluye un archivo inicial vacío, identificado como no disponible.
- Actions descarga y normaliza el calendario para el build. Conserva la última copia en la rama pública `calendar-data`, que solo contiene `schedule.json`. No mezcla ni escribe el calendario en IndexedDB.
- El historial personal sigue en la misma base IndexedDB, con el mismo esquema y clave. No se modifica al cargar o consultar el calendario ni se envía a Actions. La exportación del historial continúa conteniendo el conjunto personal, sin incorporar automáticamente el calendario remoto.
- El navegador solo consulta el JSON estático de GitHub Pages. No llama a BALLDONTLIE ni recibe la credencial. No hay backend de pago, suscripción ni contratación de pruebas gratuitas.

## Configuración de GitHub

Se utiliza el secreto existente **Settings → Secrets and variables → Actions → Secrets → BALLDONTLIE_API_KEY**. No hay que copiarlo al código, crear una variable `VITE_…`, compartirlo en el chat ni escribirlo en un log.

El workflow **Validar y publicar NBA Tendencias** se ejecuta al publicar código, manualmente y diariamente a las **08:17 UTC** (08:17 de Canarias en invierno, 09:17 en verano). No necesita `DATA_SOURCE_ENABLED`. GitHub puede retrasar las ejecuciones programadas o desactivarlas por inactividad del repositorio; se puede reactivar el workflow y ejecutarlo manualmente desde Actions. No es un marcador en directo: la interfaz indica cuándo se descargó el estado mostrado.

Pages debe seguir configurado con **Source: GitHub Actions**. El job tiene permiso `contents: write` para conservar únicamente el calendario en `calendar-data`, y el despliegue usa los permisos habituales de Pages. Si una política de la cuenta impide crear o actualizar esa rama, se verá un error en el paso de conservación y habrá que permitir ese acceso. Los pull requests no utilizan el secreto ni descargan o publican el calendario.

## Límite gratuito, errores y alcance

La [documentación oficial](https://docs.balldontlie.io/#get-all-games) incluye Games en Free, cinco peticiones/minuto, cursor y páginas de hasta 100. `seasons[]=2026` consulta 2026-27, sin filtrar `season_type`: incluye los tipos no pretemporada publicados (regular, NBA Cup, play-in y playoffs). No se generan rondas ni emparejamientos hipotéticos. Se conservan los partidos anteriores aunque dejen de aparecer en una respuesta; no se interpreta su ausencia como cancelación.

El cliente reutiliza **`GET https://api.balldontlie.io/v1/games`** y, para revisar atrasados conocidos, la consulta gratuita de un partido **`/v1/games/{id}`**. No llama a endpoints de estadísticas o planes superiores:

- Primera descarga y cada siete días: recorre el listado de la temporada hasta el último cursor; descubre nuevos cruces y revisa correcciones y cambios de horario, también lejanos. La metadata `seasonScan` solo avanza después de terminar correctamente todas las páginas. «Recorrido completo» significa el listado que devuelve la API, no un certificado de todos los partidos de la NBA.
- Otros días: consulta desde ocho días anteriores a treinta futuros (un día de margen por la diferencia horaria), combina por ID y conserva el resto. Revisa además hasta doce encuentros anteriores a la ventana cuyo estado no sea final o cancelado, priorizando la consulta/intento más antiguo. La consulta por ID detecta nuevas fechas aunque ya estén fuera de la ventana original.
- Un 404 no borra un encuentro ni lo convierte en cancelado: conserva su estado/fecha, registra el intento, avisa y continúa con los otros. Otros fallos en las revisiones individuales mantienen la actualización cercana válida y avisan de la revisión incompleta. Los partidos no reconsultados conservan su fecha de consulta original.
- Se espacian **todas** las peticiones al menos 13 segundos, incluidos reintentos y consultas individuales. Actions espera también 13 segundos antes de la primera para evitar una ráfaga inmediata entre ejecuciones. Presupuesto compartido de **22 peticiones y 330 segundos**, dentro del job existente de diez minutos. Un listado de unas 1.300 entradas necesita aproximadamente 13 páginas; el resultado efectivo se verifica en Actions.
- Fallos de paginación, temporada incorrecta o agotamiento de presupuesto durante el listado conservan la última copia completa; no se publica una temporada parcial como si estuviera completa. Una respuesta con equipos explícitamente sin asignar se omite y se cuenta, sin inventar franquicias. Si no se consigue el listado, la cobertura anterior sigue navegable con aviso; no se amplía mediante resultados ficticios.

Las [condiciones de BALLDONTLIE, §6](https://www.balldontlie.io/terms.html), permiten almacenar y mostrar los datos obtenidos lícitamente en aplicaciones propias, con los límites del plan; no se ofrece este calendario como una API sustitutiva para terceros. Sus permisos no acreditan derechos ajenos (§11), ni convierten los datos en oficiales. No se añaden imágenes, logotipos ni contenido de NBA.com. La integración usa únicamente la fuente de calendario ya configurada.

Se validan IDs propios de BALLDONTLIE y abreviaturas antes de convertirlos a las claves comunes de las 30 franquicias. Por ejemplo, el ID de Lakers de BALLDONTLIE es distinto del de ESPN; no se cruzan esos números. Se deduplican partidos por ID y se ordenan por fecha/hora; se reconocen `status_state` y los estados heredados cuando son inequívocos. La especificación [OpenAPI](https://www.balldontlie.io/openapi/nba.yml) utiliza también rutas `/nba/v1/…`; esta integración sigue la ruta `/v1/games` documentada en la guía y solicitada para el proyecto.

Si falla autenticación, red, paginación o validación, se conserva íntegra la última descarga válida, su fecha y un aviso. Si nunca hubo una descarga válida se muestra un calendario vacío con explicación. Los errores públicos usan códigos genéricos (por ejemplo, `HTTP_401` o `SECRET_MISSING`), nunca respuestas crudas, encabezados ni credenciales. También se avisa si la última copia supera 36 horas.

**Estadísticas individuales, alineaciones, lesiones, plantillas activas verificadas y cuotas no se consultan.** No están cubiertas por esta integración gratuita; las estadísticas se obtienen del historial personal importado. `data-source.json` continúa con `enabled: false` y SportsDataverse/ESPN no se publica. Las frecuencias históricas no equivalen a probabilidades ni a recomendaciones de apuestas.

## Verificación

`npm test` incluye pruebas de carga de temporada con más de 1.200 encuentros sintéticos, revisión incremental/semanal, aplazados que cambian de fecha, conservación sin duplicados, presupuestos, meses/años/bisiestos, filtros y paginación, además de la normalización de las 30 franquicias, paginación, pausas y reintentos, deduplicación, estados, horarios, ausencia de horas inventadas, fallo sin pérdida del último calendario, separación del historial y conservación de la desactivación de estadísticas. Las fixtures son sintéticas. `npm run build` compila la web. La comprobación autenticada se realiza exclusivamente en Actions con el secreto; su resultado se acredita mediante el paso de descarga y el JSON público resultante, sin extraer el secreto.

### Comprobación autenticada del 20 de octubre de 2026

La [ejecución inicial de Actions](https://github.com/oliver07atm/nba-tendencias/actions/runs/39455235565) completó descarga, pruebas, compilación, conservación y publicación. El secreto fue aceptado por `/v1/games`: tres peticiones paginadas devolvieron 226 partidos; 222 quedaron dentro del intervalo público de fechas de Canarias. La copia contiene las 30 franquicias, sin horas ausentes. Había 107 encuentros entre hoy y los próximos 14 días. Los recuentos cambian con cada actualización.

Se contrastaron dos encuentros del JSON con las páginas originales de NBA.com:

| Encuentro | Fuente NBA (hora del Este) | UTC en BALLDONTLIE | Canarias |
| --- | --- | --- | --- |
| [Boston visitante en Detroit](https://www.nba.com/game/BOS-vs-DET-0022600001) | 20/10/2026, 15:00 ET | 20/10, 19:00 UTC | 20/10, 20:00 |
| [Philadelphia visitante en New York](https://www.nba.com/game/PHI-vs-NYK-0022600002) | 20/10/2026, 19:00 ET | 20/10, 23:00 UTC | 21/10, 00:00 |

La prueba en navegador utilizó este calendario real y un historial sintético de tres temporadas en un perfil aislado: abrió estadísticas desde Boston, mostró 200 actuaciones, cuartos del equipo y tendencias. Verificó mediante una huella SHA-256 que consultar partidos, fechas, gráficos y recargar no modificaba la copia guardada en IndexedDB. También comprobó fallo con conservación del calendario, ausencia de subidas y presentación móvil. No se accedió a la base personal del usuario ni se certificaron plantillas vigentes.

## Revisión de octubre de 2026

La versión mensual reutiliza las tarjetas, los detalles de partido, las plantillas y la navegación existentes. No modifica las bases IndexedDB ni los registros personales. Mantiene los avisos de estadísticas individuales sin sincronizar. La descarga autenticada se ejecuta exclusivamente en Actions con el secreto ya guardado; no hay nuevas claves ni ajustes de pago. La cobertura y la fecha de revisión efectivas se muestran desde el JSON producido por esa ejecución, sin incluir credenciales.
