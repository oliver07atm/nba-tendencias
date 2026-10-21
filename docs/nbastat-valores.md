# NBA Stat: decodificador estructural y segunda revisión privada

21/10/2026. La primera ejecución real fue realizada por el usuario y terminó con SUCCESS. Se ha utilizado la estructura que comunicó; no se han visto todavía los valores reales. **Esta actualización de código no consulta NBA Stat ni publica estadísticas.**

## Qué decodifica ahora

`scripts/lib/nbastat/decoder.mjs`, reexportado desde el cliente existente, lee exclusivamente `data.game` y `data.players`. Los nombres confirmados se relacionan así con el contrato interno:

| NBA Stat | Motor de NBA Tendencias |
| --- | --- |
| player_id, team_id, game.id | IDs internos con namespace NBA Stat; nunca IDs NBA/ESPN implícitos |
| points | points |
| rebounds_total | rebounds |
| assists | assists |
| three_pointers_made / three_pointers_attempted | threeMade / threeAttempted |
| field_goals_made / field_goals_attempted | fieldMade / fieldAttempted |
| steals / blocks / turnovers | steals / blocks / turnovers |
| minutes | conservado sin convertir hasta revisar formato |

Conserva los campos originales del jugador en memoria privada, incluidos rebotes ofensivos/defensivos, libres, faltas, más/menos, `played`, `starter`, estado, motivos y descripciones DNP. Los porcentajes adicionales también quedan en el objeto original: **no se interpreta su escala ni se usa para derivar conteos**. El decoder no adivina cómo se llaman campos de porcentaje o nombres de equipos de `game` no especificados por el usuario. Los nombres e identificadores comunicados por el proveedor no constituyen por sí solos una correspondencia NBA/ESPN verificada.

Valida tipos de los campos confirmados, IDs, jugadores duplicados, pertenencia a los dos IDs de equipo, conteos, tiros y puntos, y total de rebotes. Comprueba `PTS = 2×FGM + 3PM + FTM`, tiros anotados/intentos y `REB = OREB + DREB` cuando no falten valores. Compara la suma de puntos disponible con los dos marcadores. Los valores nulos no se sustituyen por cero. Un total incompleto produce diagnóstico pendiente; no se certifica su coherencia.

Sin una revisión explícita devuelve `ready: false`, `VALUE_SEMANTICS_UNVERIFIED` y observaciones para revisar en privado. **No convierte un número `played` en booleano**. Tampoco infiere DNP de minutos nulos, cero puntos, una cadena de estado o una plantilla. No interpreta automáticamente `game_date`, `scheduled`, `season` o estado final.

## Segunda comprobación: una consulta, respuesta cifrada

La estructura sola no permite decidir si un minuto `"12.34"` es decimal u otra notación, qué números usa `played`, si los estados DNP se contradicen o qué zona horaria representa una fecha. Hace falta revisar valores. Un repositorio público no permite tratar sus artefactos y logs como un almacén privado; por eso la muestra se cifra **antes de escribir cualquier archivo**.

1. Mantener `NBASTAT_API_TOKEN` como está. No hace falta cambiar el token ni crear otra API key.
2. Generar con un gestor de contraseñas una **contraseña aleatoria independiente de al menos 32 caracteres**. Conservarla privadamente: servirá para descifrar la muestra. No utilizar el token API, un ejemplo del repositorio, una frase predecible ni enviar esta contraseña al chat.
3. En GitHub → Settings → Secrets and variables → Actions → New repository secret, guardar esa contraseña como **`NBASTAT_PROBE_PASSPHRASE`**. No es una variable pública ni una credencial que llegue al navegador.
4. Sin otros clientes externos activos usando la misma cuenta: Actions → **NBA Stat - revisión privada cifrada 1369** → Run workflow → rama **main**, escribir **`VALIDATE_1369`** y marcar la confirmación de que no hay otros clientes externos activos. No hace falta esperar una hora después de la primera consulta: se comprueba la cuota persistente antes de cada petición. No repetir la primera inspección estructural: esta prueba usa una única consulta a `/api/v1/games/1369/boxscore`.
5. Descargar el artefacto **`nbastat-1369-encrypted-review`** antes de que caduque (retención solicitada: un día). Dentro está `review.sealed.json`, que solo contiene sal, IV, tag y ciphertext AES-256-GCM. Su confidencialidad depende de la contraseña aleatoria; no compartirla ni publicar una copia en claro. GitHub puede permitir descargar el ciphertext: no contiene estadísticas legibles ni token.

La reserva se persiste antes de HTTP en **la misma rama de cuota y el mismo grupo de concurrencia** de la primera prueba. Diez solicitudes por ventana móvil de 60 minutos como máximo entre estos workflows, incluidos fallos; los consumos externos de la cuenta no se pueden observar. Si quedan menos de diez reservas en la ventana y no hay bloqueo, la consulta puede hacerse inmediatamente aunque existan solicitudes recientes. Al agotarse la cuota se aplaza sin HTTP y se indica la primera fecha permitida; se podrá volver a iniciar manualmente entonces. No se programa un reintento automático. Se respetan 429/Retry-After, sin reintentos inmediatos. Un secreto de cifrado ausente o débil bloquea la prueba antes de consultar. Sin permiso para guardar la reserva tampoco hay HTTP. No hay cron, Pages, llamadas de descubrimiento o consultas de perfiles en este workflow.

La respuesta cruda se mantiene en memoria y se cifra con una clave derivada por scrypt. No se registra ni se guarda en claro en el runner. El token se proporciona solo al paso de consulta, no al paso de subida. Si la respuesta incluyese literalmente alguna de las credenciales se rechaza y no se empaqueta. El resumen público no contiene valores del partido, porcentajes, nombres o IDs de jugadores. Los errores públicos usan códigos seguros. No activar depuración ni volcar el entorno.

**SUCCESS significa que se ha preparado una muestra cifrada, no que se haya validado el partido.** El paquete incluye la respuesta original, el diagnóstico estructural o su código de fallo, las observaciones y la lista de identidades pendientes. La referencia 1369/121–113/35 comunicada por el proveedor se etiqueta como tal. Se comparan ID interno, marcador y cantidad de registros, sin elevar esas coincidencias a verificación de equipos, fecha o participantes.

### Abrir la muestra localmente (sin otra consulta API)

En una copia local del proyecto con Node 22 o superior, crear la carpeta `work/` si no existe y copiar allí `review.sealed.json`. `work/` está excluida de Git. En una terminal bash:

```bash
mkdir -p work
read -rs -p 'Contraseña privada de la muestra: ' NBASTAT_PROBE_PASSPHRASE
export NBASTAT_PROBE_PASSPHRASE
node scripts/open-nbastat-review.mjs work/review.sealed.json work/nbastat-private-review.json
unset NBASTAT_PROBE_PASSPHRASE
```

La contraseña se introduce sin eco y no se escribe como argumento ni literal en el historial. El script funciona sin red, no necesita el token API, no imprime el contenido y solo permite crear un archivo nuevo dentro de `work/`, con permisos `0600`. Rechaza contraseña incorrecta o paquete alterado. No sobrescribe un archivo anterior. Revisar el JSON con un editor local; no subirlo a GitHub, Pages o servicios públicos. Conservar una copia cifrada permite revisar sin repetir solicitudes. Si necesitas ayuda, se puede compartir únicamente la información semántica que se haya revisado, sin credenciales; no es necesario compartir el JSON íntegro.

## Revisión necesaria antes de generar actuaciones reales

- Confirmar ID 1369, fecha/horario/zona, temporada, equipos y estado final. No confundir la fecha local estadounidense con la fecha de Canarias.
- Confirmar 121 de Detroit y 113 de Boston, y revisar los 35 registros: cantidad de registros **no es cantidad de participantes**.
- Clasificar cada combinación real de `played`, `status`, `not_playing_reason` y `not_playing_description`. Revisar que no contradiga las estadísticas. Los valores no revisados quedan pendientes.
- Determinar el formato exacto de minutos y el significado de null y otras cadenas para DNP. El código puede convertir decimal textual o `mm:ss` **solo cuando el formato esté confirmado**. Otros formatos necesitan implementación y pruebas específicas. Los minutos DNP deben estar aprobados expresamente; no se convierten en actuaciones a cero. DNP con estadísticas positivas se rechaza.
- Revisar la aritmética de cada actuación y las sumas por equipo. DNP nulos no impiden por sí solos validar posteriormente la suma de quienes jugaron. No inventar un box score de equipos ni rebotes de equipo sumando sin más a los jugadores.
- Comparar P/R/A/triples de actuaciones concretas con fuentes originales consultables y autorizadas. Confirmar completitud: un marcador final por sí solo no acredita que el box score esté completo.
- Verificar las correspondencias NBA Stat → NBA/ESPN. `nbaStatIdentityChecklist()` prepara candidatos **pendientes**, sin enlaces ni nacimientos inventados. La lista no dice «sin historial». Las correspondencias revisadas deben superar el validador ya existente: IDs estables, perfiles de ambos lados, nacimiento de ambas fuentes coincidente y fecha de revisión. No autoenlazar por nombre ni consultar 35 perfiles de golpe; esas consultas comparten el presupuesto.

El objeto `review` del decoder es un acta **por partido**, no un conjunto de valores por defecto: exige estado revisado, evidencia y fecha, ID exacto, observaciones originales exactas de fecha/horario/temporada/estado, declaración explícita de final/completo, fecha normalizada, temporada, competición, formato de minutos, valores DNP aprobados y tabla de participación revisada. Un cambio en los valores originales invalida el acta. No existe aún un acta real aprobada. Los fixtures usan números **7 y 9 ficticios** para demostrar que no se presupone 1/0; no son valores atribuidos a NBA Stat.

## Camino al gráfico y a la automatización

Después de la revisión: decoder → contrato interno → `prepareNbaStatGame()` con correspondencias verificadas → `applyNbaStatGame()` → capa independiente → vista combinada de lectura. El ID estable por partido/jugador evita duplicados y una revisión posterior sustituye únicamente ese partido en la capa nueva. Los partidos de equipos anteriores siguen en el historial del jugador. Los controles existentes retienen posibles colisiones con otras fuentes, revisiones antiguas e identidades pendientes.

Las pruebas con actuaciones **ficticias** recorren ese camino hasta las series 5/10/15/20 y tendencias, comprueban revisiones, DNP y que los originales no se alteran. No acreditan que Cade Cunningham jugara o que su ID esté vinculado todavía. El siguiente paso real es revisar la muestra cifrada y completar esas correspondencias; después se podrá probar el lote en una copia local del historial, antes de publicar cualquier estadística. El enganche a React y la entrega pública siguen desactivados.

No se escriben las bases del historial personal, plantillas o directorio. No se alteran retiradas, calendario BALLDONTLIE, filtros o navegación. No hay sincronización masiva ni APIs de pago.

Atribución obligatoria al mostrar datos NBA Stat:

> Statistics sourced from NBA Stat and published with permission. NBA Stat is not affiliated with or endorsed by the NBA.
