# Calendario real con BALLDONTLIE · 0 €

## Uso sin programar

Abre **Partidos**: la vista inicial muestra hoy y los próximos 14 días, según el día de Canarias. En **Fechas del calendario** puedes elegir un día o todas las fechas descargadas (habitualmente los siete días anteriores y los treinta siguientes). La descarga pide un día anterior adicional para cubrir los partidos de Estados Unidos que caen de madrugada en Canarias.

Cada tarjeta muestra visitante, local, hora de Canarias y estado comunicado por la fuente. Los horarios usan `Atlantic/Canary`, incluido el cambio de hora. Si la API no proporciona una fecha y hora inequívocas con zona, se muestra **Hora por confirmar**; la fecha de origen no garantiza el día exacto en Canarias. No se inventan horas, encuentros ni alineaciones. Los partidos aplazados conservan la fecha que devuelve la fuente hasta que esta cambie.

Abre un partido para consultar sus equipos. Por defecto se muestran solo pertenencias con revisión manual vigente de la base independiente, cuya cobertura es **parcial**. Los demás jugadores asociados al historial están en «Jugadores históricos». Las tendencias de jugadores utilizan las pertenencias revisadas; no hay una plantilla completa ni disponibilidad verificada. Consulta la [actualización de plantillas y navegación](plantillas-y-navegacion.md). Al abrir un jugador se conserva su historial disponible entre equipos y temporadas, con los filtros existentes.

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

La [documentación oficial](https://docs.balldontlie.io/#account-tiers) incluye Games en Free con cinco peticiones por minuto. El cliente utiliza **solo `GET https://api.balldontlie.io/v1/games`**, páginas de hasta 100 resultados y cursores hasta terminar. Espacia las peticiones al menos 13 segundos, incluidos reintentos. Reintenta errores temporales y 429 con espera; si el proveedor solicita esperar más de un minuto, conserva la copia anterior para el siguiente ciclo. Nunca cambia de plan ni intenta endpoints de pago.

Se validan IDs propios de BALLDONTLIE y abreviaturas antes de convertirlos a las claves comunes de las 30 franquicias. Por ejemplo, el ID de Lakers de BALLDONTLIE es distinto del de ESPN; no se cruzan esos números. Se deduplican partidos por ID y se ordenan por fecha/hora; se reconocen `status_state` y los estados heredados cuando son inequívocos. La especificación [OpenAPI](https://www.balldontlie.io/openapi/nba.yml) utiliza también rutas `/nba/v1/…`; esta integración sigue la ruta `/v1/games` documentada en la guía y solicitada para el proyecto.

Si falla autenticación, red, paginación o validación, se conserva íntegra la última descarga válida, su fecha y un aviso. Si nunca hubo una descarga válida se muestra un calendario vacío con explicación. Los errores públicos usan códigos genéricos (por ejemplo, `HTTP_401` o `SECRET_MISSING`), nunca respuestas crudas, encabezados ni credenciales. También se avisa si la última copia supera 36 horas.

**Estadísticas individuales, alineaciones, lesiones, plantillas activas verificadas y cuotas no se consultan.** No están cubiertas por esta integración gratuita; las estadísticas se obtienen del historial personal importado. `data-source.json` continúa con `enabled: false` y SportsDataverse/ESPN no se publica. Las frecuencias históricas no equivalen a probabilidades ni a recomendaciones de apuestas.

## Verificación

`npm test` comprueba normalización de las 30 franquicias, paginación, pausas y reintentos, deduplicación, estados, horarios, ausencia de horas inventadas, fallo sin pérdida del último calendario, separación del historial y conservación de la desactivación de estadísticas. Las fixtures son sintéticas. `npm run build` compila la web. La comprobación autenticada se realiza exclusivamente en Actions con el secreto; su resultado se acredita mediante el paso de descarga y el JSON público resultante, sin extraer el secreto.

### Comprobación autenticada del 20 de octubre de 2026

La [ejecución inicial de Actions](https://github.com/oliver07atm/nba-tendencias/actions/runs/39455235565) completó descarga, pruebas, compilación, conservación y publicación. El secreto fue aceptado por `/v1/games`: tres peticiones paginadas devolvieron 226 partidos; 222 quedaron dentro del intervalo público de fechas de Canarias. La copia contiene las 30 franquicias, sin horas ausentes. Había 107 encuentros entre hoy y los próximos 14 días. Los recuentos cambian con cada actualización.

Se contrastaron dos encuentros del JSON con las páginas originales de NBA.com:

| Encuentro | Fuente NBA (hora del Este) | UTC en BALLDONTLIE | Canarias |
| --- | --- | --- | --- |
| [Boston visitante en Detroit](https://www.nba.com/game/BOS-vs-DET-0022600001) | 20/10/2026, 15:00 ET | 20/10, 19:00 UTC | 20/10, 20:00 |
| [Philadelphia visitante en New York](https://www.nba.com/game/PHI-vs-NYK-0022600002) | 20/10/2026, 19:00 ET | 20/10, 23:00 UTC | 21/10, 00:00 |

La prueba en navegador utilizó este calendario real y un historial sintético de tres temporadas en un perfil aislado: abrió estadísticas desde Boston, mostró 200 actuaciones, cuartos del equipo y tendencias. Verificó mediante una huella SHA-256 que consultar partidos, fechas, gráficos y recargar no modificaba la copia guardada en IndexedDB. También comprobó fallo con conservación del calendario, ausencia de subidas y presentación móvil. No se accedió a la base personal del usuario ni se certificaron plantillas vigentes.
