# NBA Tendencias

Primera versión funcional en español con **React, Vite y Recharts**, estática y preparada para GitHub Pages. No utiliza servicios de pago ni cuentas de prueba. El calendario real usa una clave gratuita exclusivamente en GitHub Actions; los históricos personales permanecen en el navegador.

## Estado de los datos

**El calendario real de BALLDONTLIE está separado de las estadísticas.** Consulta la [guía del calendario y su configuración](docs/calendario-balldontlie.md). Las estadísticas iniciales son **DEMOSTRACIÓN**; puedes activar tu historial personal importado. Los nombres de equipos y jugadores sirven para ilustrar la navegación; no acreditan plantillas vigentes. Hay 6 equipos, 18 jugadores y 7.680 registros sintéticos (320 por entidad), repartidos entre varias temporadas. El generador de demostración es determinista. El calendario remoto no inventa partidos ni acredita plantillas actuales.

### Investigación de fuentes (20 de octubre de 2026)

- [BALLDONTLIE: documentación oficial](https://docs.balldontlie.io/#account-tiers): el nivel gratuito incluye equipos, jugadores y partidos, pero Game Player Stats no está en el nivel gratuito. Se conecta exclusivamente Games para el calendario. No cubre gratuitamente las estadísticas individuales ni las alineaciones.
- [nba_api](https://github.com/swar/nba_api): cliente de código abierto con licencia MIT. Su licencia de software no equivale a una autorización de redistribuir todos los datos obtenidos.
- [Condiciones de uso de NBA.com](https://www.nba.com/termsofuse): hay condiciones específicas para estadísticas y bases de datos. No se ha establecido autorización para este producto ni se ha integrado extracción automática.
- ESPN y 365Scores: referencias visuales/de contenido; no se asume permiso de scraping. No hay extractores implementados.

El calendario real cubre las 30 franquicias; la publicación de estadísticas individuales sigue desactivada. No se confunden frecuencias con probabilidades o rentabilidad.

Consulta la [guía de tendencias, líneas exploratorias, calidad descriptiva y cuotas manuales](docs/tendencias.md). Incluye ventanas 5/10/15/20, filtros combinables, acceso desde partidos y cálculos con una estimación predictiva introducida por el usuario, separados de la frecuencia histórica.

## Ejecutar y verificar

Requiere Node.js 22.12+ (o 24).

```bash
npm ci
npm run dev
npm test
npm run build
```

Vite sirve la app bajo `/nba-tendencias/`. `dist/` es la web compilada. No hace falta un servidor backend. Si cambia el nombre del repositorio, modifica `base` en `vite.config.js`. Las fuentes tipográficas usan alternativas locales y la web funciona sin fuentes externas.

## Publicar gratis en GitHub Pages

1. Sube estos archivos a la rama `main` de `oliver07atm/nba-tendencias` (sin `node_modules` ni `dist`). Si ya están en GitHub, omite este paso.
2. En el repositorio abre **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. En **Actions**, ejecuta **Validar y publicar NBA Tendencias → Run workflow** o realiza un push a `main`.
4. Espera a que pasen pruebas, compilación y despliegue. La dirección prevista es `https://oliver07atm.github.io/nba-tendencias/`.

El workflow valida también pull requests sin publicarlos. El repositorio público permite Pages y los runners estándar sin contratar planes de pago. No añadas una tarjeta, servicios comerciales ni runners facturables. Si Pages no está activado, el trabajo de despliegue fallará hasta completar el paso 2; los artefactos de compilación siguen disponibles en Actions.

## Funcionalidades

- Calendario ordenado, con zona IANA `Atlantic/Canary`, incluyendo horario de verano. Pulsar un partido abre sus jugadores y accesos al análisis de ambos equipos.
- Jugadores: puntos, rebotes, asistencias, triples anotados/intentados, tiros de campo anotados/intentados, robos, tapones, pérdidas, minutos, PRA, PR, PA y RA.
- Equipos: anotados/recibidos por cuarto, mitad y partido; triples, rebotes, asistencias a partido completo; margen y puntos combinados por periodo. Puede analizarse la producción del rival contra el equipo.
- Líneas numéricas libres, mayores/menores, últimos 5–300, cantidad personalizada o todos los registros disponibles. Filtros por local/visitante, rival, competición y múltiples temporadas.
- Gráfico Recharts con colores de cumplimiento, fecha/rival/valor en tooltip, tabla por encuentro y exportación JSON del análisis.
- Tendencias para entidades de los equipos del calendario cargado, ordenables y con muestra ajustable. Se usa una línea exploratoria derivada de la mediana y se calculan ambas direcciones. No hay motor predictivo ni cuotas.
- Importación personal de tres CSV de SportsDataverse/hoopR desde Datos, procesada en un Web Worker, combinación de temporadas sin duplicados y guardado local en IndexedDB. También admite JSON/CSV normalizado, exportación JSON para otro dispositivo y vuelta a demostración sin borrar el historial. No se suben archivos ni estadísticas.

## Fórmulas y convenciones

- Más de: `valor > línea`. Menos de: `valor < línea`.
- Igualar una línea entera no cuenta como acierto para ninguna dirección. Se informa como empate y permanece en el denominador.
- Frecuencia: `100 × aciertos / registros válidos`; sin registros muestra 0 y el aviso vacío.
- PRA: P+R+A. PR: P+R. PA: P+A. RA: R+A.
- Primero se filtran temporadas/condición/rival/competición, después se ordena por fecha descendente y se toman N registros. El gráfico muestra cronología ascendente.
- 1.ª mitad = Q1+Q2, 2.ª mitad = Q3+Q4. Partido completo incluye todas las entradas de cuartos, incluidas prórrogas; las mitades excluyen prórrogas.
- Margen = puntos propios − puntos del rival. Para cubrir un hándicap +5,5 usa margen mayor que −5,5; para −5,5 usa margen mayor que +5,5. Combinados = puntos propios + rival.
- Un registro representa una actuación disputada; no importes DNP como ceros. Minutos decimales, nunca texto `MM:SS`. Estadísticas ausentes no se inventan; el esquema actual exige una fila completa.

## Formato de importación

Descarga un ejemplo desde **Datos**. JSON tiene esta envoltura:

```json
{
  "meta": {"mode": "imported", "source": "Nombre y procedencia"},
  "teams": [{"id": "BOS", "name": "Boston Celtics", "color": "#29c78b"}],
  "schedule": [{"id": "g1", "date": "2026-10-21T00:30:00Z", "home": "BOS", "away": "LAL", "competition": "Temporada regular"}],
  "records": []
}
```

Cada registro requiere `id` único, `kind` (`player` o `team`), `entity` (nombre del jugador o ID equipo), `team`, `opponent`, `date` ISO con zona, `venue` (`home`/`away`), `season`, `competition`, y valores numéricos no negativos: `points`, `rebounds`, `assists`, `threeMade`, `threeAttempted`, `fieldMade`, `fieldAttempted`, `steals`, `blocks`, `turnovers`, `minutes`.

Los registros `team` añaden `quarters`, `opponentQuarters` (listas de al menos 4 números, prórrogas opcionales) y `opponentStats` con las mismas estadísticas numéricas del rival. `points` debe coincidir con la suma de `quarters`. En equipos, `entity` debe coincidir con `team`.

CSV usa los mismos nombres de columnas; **solo contiene records**, por lo que no carga calendario. Usa comillas CSV estándar y JSON dentro de celdas `quarters`, `opponentQuarters` y `opponentStats`. Separador coma. Hay un ejemplo válido en `public/data/ejemplo.csv`. Máximo 256 MB para JSON/CSV normalizado y 300.000 registros. En el formulario de tres archivos, cada CSV admite hasta 64 MB. Los archivos importados se muestran como importados sin verificar aunque declaren `real`.

## Calendario real automático

El workflow consulta exclusivamente partidos gratuitos de BALLDONTLIE con `BALLDONTLIE_API_KEY` desde GitHub Secrets, cada día a las 08:17 UTC. Publica un JSON mínimo y conserva la última descarga en `calendar-data`. El calendario no se guarda en IndexedDB ni modifica el historial personal. [Guía de uso, privacidad, configuración y límites](docs/calendario-balldontlie.md).

## Preparación de actualización automática de estadísticas

`data-source.json` está **desactivado**. `npm run update-data` no hace peticiones mientras siga así. La interfaz busca `data/current.json` y usa `demo.json` si no está disponible.

Cuando exista una fuente **gratuita y con permiso documentado para almacenar, transformar y redistribuir**:

1. Implementa la transformación al esquema anterior si la fuente no lo proporciona directamente. El adaptador actual solo descarga JSON normalizado; no conecta NBA/ESPN/365Scores.
2. Configura `data-source.json`: `enabled: true`, nombre, `url` HTTPS, `licenseUrl` y `redistributionAllowed: true`, tras comprobar las condiciones. No incrustes credenciales.
3. Ejecuta `npm run update-data`, `npm test` y `npm run build`. Un error impide reemplazar el archivo anterior. El proveedor debe declarar `meta.mode: real`.
4. Documenta permiso de la fuente original y dos comparaciones de P/R/A/triples siguiendo [el procedimiento](docs/importar-hoopr.md). El actualizador los exige antes de publicar. Versiona un `public/data/current.json` inicial válido para conservar una copia de referencia. El workflow actualiza la copia del build, no hace commits automáticos.
5. En Settings → Secrets and variables → Actions → Variables, crea `DATA_SOURCE_ENABLED=true`. Esta variable pertenecía a la actualización de estadísticas. El calendario ya se actualiza diariamente a las 08:17 UTC sin esa variable; las estadísticas siguen desactivadas. La actualización se incluye en el mismo build que se publica; el JSON queda en el artefacto de Pages.

El plan no requiere gastos. No hay fuente de estadísticas individuales habilitada ni promesa de seguimiento en directo; hay que evaluar la licencia, cobertura, disponibilidad y límites del futuro proveedor. El modo real representa lo declarado por esa fuente, no una auditoría independiente.

## Próximas mejoras

Datos reales autorizados para los 30 equipos, plantillas históricas con IDs estables, tratamiento de traspasos, ampliación de fechas del calendario, historial incremental, estadísticas parciales con valores ausentes y filtros de tendencias más avanzados. El formato acepta `entityId` estable y conserva compatibilidad con los datos de demostración anteriores; el adaptador hoopR utiliza IDs de jugador y distingue homónimos y traspasos. La muestra puede ser menor que N si no hay suficientes partidos.

## Revisión de SportsDataverse / ESPN

Se ha inspeccionado la cobertura de 2024-25 y 2025-26. **No se publican esos datos: derechos de la fuente original y precisión aún sin verificar.** La licencia CC BY 4.0 del productor no prueba por sí sola permiso de ESPN. La web conserva estadísticas de demostración como alternativa al historial personal; el calendario real se obtiene por separado de BALLDONTLIE.

- [Investigación, cobertura observada, licencias y limitaciones](docs/fuentes-nba.md).
- [Conversor local de CSV y combinación de temporadas](docs/importar-hoopr.md): `npm run import:hoopr`. No descarga datos ni publica su salida; solo permite escribir en `work/`.
- Los gráficos y filtros conservan su funcionamiento. Se admiten IDs estables, historial de traspasos, homónimos, dos o más temporadas y muestras de 100/150/200 actuaciones disponibles.
- `npm test` incluye las pruebas originales y casos nuevos del importador y los controles de publicación. Las fixtures de estas pruebas son inventadas, no resultados reales.

## Alternativas gratuitas y uso relacionado con apuestas

Se han revisado Highlightly NBA API, TheSportsDB y API-NBA. **Ninguna está aprobada para conectar y publicar datos en el uso solicitado.** API-NBA es la candidata técnica para aclarar permisos y probar cobertura; Highlightly tiene una restricción relevante sobre apuestas y TheSportsDB no acredita la cobertura gratuita necesaria.

- [Comparación de cobertura, límites, condiciones y recomendación](docs/alternativas-api-gratuitas.md).
- [Cómo guardar una posible clave gratuita en GitHub Secrets](docs/claves-api.md).

Esas alternativas no están conectadas. BALLDONTLIE se conecta únicamente para el calendario gratuito; la demostración y la desactivación de estadísticas automáticas se conservan.

**Datos → Actualización de estadísticas** muestra ahora las fechas del historial por separado del calendario, los finales sin actuaciones localizadas y las discrepancias detectables. Los gráficos y las tendencias avisan de que no se incorporan actuaciones automáticamente. Se conservan los finales públicos descargados de la temporada para revisar el desfase al volver tras varios días; no se descargan box scores ni se escribe en los históricos. [Auditoría actualizada, fuentes, límites y diseño pendiente](docs/actualizacion-estadisticas.md).

## Historial personal en el navegador

En **Datos → Importar estadísticas NBA desde CSV**, selecciona jugadores, equipos y calendario de la misma temporada y pulsa **Convertir e importar temporada**. Repite el proceso para añadir temporadas. El historial se identifica como de procedencia declarada, pendiente de verificación.

Con el guardado activado, IndexedDB lo recupera al volver a abrir la web. **Exportar historial JSON** permite trasladarlo al iPhone y cargarlo desde **Importar JSON o CSV**. El guardado depende del navegador y no sustituye una copia JSON de seguridad. La demostración permanece disponible y los datos importados no se publican en GitHub.

Consulta la [guía de uso sin programar](docs/importacion-personal.md). Las actualizaciones de estadísticas individuales siguen desactivadas; esta función solo procesa archivos seleccionados por el usuario. La actualización del calendario real es independiente y no toca IndexedDB.

## Plantillas personales y navegación

Las 30 listas oficiales 2026-27 se contrastaron el 20 de octubre de 2026: 519 jugadores, incluidos 17 de Boston y 18 de Detroit. El archivo preparado para importación personal se entrega por separado; no se redistribuye en GitHub ni en Pages. Hay 304 cruces de identidad NBA/ESPN contrastados y 215 pendientes. El build público solo incluye el esquema vacío.

En **Datos → Plantillas actuales → Importar plantillas JSON**, selecciona el archivo privado, revisa la vista previa y guárdalo en el navegador. Se utiliza una base IndexedDB independiente; los históricos personales no se reemplazan. Los jugadores actuales sin estadísticas enlazadas permanecen visibles. Se distingue a los históricos con otro equipo confirmado de los pendientes de verificar. Las revisiones antiguas se avisan sin ocultar jugadores.

React Router con HashRouter conserva los enlaces a partidos y análisis, los filtros y Atrás/Adelante. No se modifica la navegación en esta actualización. [Recuento de los 30 equipos, fuentes, importación y limitaciones](docs/estado-plantillas.md). El calendario gratuito y la demostración se mantienen.

## Identidades y retiradas sin modificar el historial

**Datos → Identidades y estados de jugadores** permite importar y exportar correcciones JSON (10 MB), consultar el informe de enlaces y revisar estados activo/retirado/desconocido con fuente y fecha. Las correcciones se guardan en una tercera base local, sin sustituir los históricos ni las plantillas. Solo las retiradas confirmadas se excluyen del selector y de las tendencias individuales; los resultados de equipos conservan todos sus registros. [Guía de importación, estados, evidencias y formato](docs/identidades-y-estados.md).

## Calendario mensual y temporada publicada

En **Partidos** puedes avanzar por meses, elegir fecha y filtrar por equipo/estado. **Solo tarjetas** conserva la vista de próximos 14 días; las listas largas tienen páginas de 30 partidos. Los filtros y la página se conservan al volver desde un partido o un gráfico. Las tendencias de un partido admiten cualquier fecha futura descargada.

Actions intenta descargar inicialmente todos los encuentros publicados de 2026-27 y revisa ese listado semanalmente. Los demás días actualiza fechas cercanas y partidos atrasados por ID, conservando los anteriores sin duplicarlos. La interfaz muestra la cobertura realmente obtenida y avisa si falta una descarga. Los cruces aún no publicados de NBA Cup/playoffs no se inventan. No se modifica IndexedDB ni se activan estadísticas individuales. [Uso, cobertura, permisos, límites y pruebas](docs/calendario-balldontlie.md).

## NBA Stat: prueba manual preparada, sincronización desactivada

Se ha registrado la autorización por correo comunicada por el usuario para publicar JSON en este proyecto no comercial. La cuota, validaciones y revisiones siguen probándose con datos ficticios. Un workflow separado permite inspeccionar únicamente la estructura del partido 1369 después de guardar `NBASTAT_API_TOKEN` en Actions Secrets y confirmar manualmente la consulta. No se ejecuta al publicar código, no guarda la respuesta cruda ni publica estadísticas. Faltan confirmar los significados de los valores reales, las comprobaciones de calidad, las identidades internas y la entrega incremental. Los históricos personales y el calendario permanecen independientes. [Configuración paso a paso y límites](docs/nbastat-preparacion.md).

El usuario ya ha comunicado la estructura de la primera respuesta real. El decoder lee los campos confirmados y mantiene pendientes sus significados. Hay una [segunda prueba manual cifrada](docs/nbastat-valores.md) para revisar valores sin publicar estadísticas: requiere una contraseña aleatoria separada en `NBASTAT_PROBE_PASSPHRASE`, conserva la misma cuota y no se ejecuta automáticamente.

NBA Stat admite ahora la [importación privada del caso 1369 desde Datos](docs/nbastat-importacion-privada.md), con vista previa, correspondencias independientes, DNP separados y una capa local que alimenta gráficos y tendencias sin reemplazar el historial original. La sincronización masiva sigue desactivada.

Las [identidades NBA Stat admiten evidencias alternativas al nacimiento](docs/nbastat-identidades-alternativas.md): referencia explícita NBA/ESPN o correspondencia confirmada por el proveedor. Hay una inspección cifrada manual del perfil 1548 y una vía por lotes, ambas inactivas hasta ejecución manual. No se inventan fechas ni se enlaza por nombre.

Se ha preparado una [cola incremental NBA Stat desactivada](docs/nbastat-cola-inactiva.md), alimentada por el calendario completo BALLDONTLIE, con estados, caché privada, bloqueos de identidad, revisiones, cuota compartida y checkpoints cifrados. Es infraestructura interna sin nuevo workflow ni consultas reales; faltan los enlaces verificados y conectar/probar la persistencia cifrada entre runners antes de activarla.

La [auditoría de privacidad de la persistencia NBA Stat](docs/nbastat-persistencia-auditoria.md) retira el adaptador de checkpoints sobre el repositorio público. La alternativa privada no está desplegada y la sincronización sigue desactivada.

[Guía del buscador de jugadores y sus pruebas](docs/buscador-jugadores.md).

La [prueba integral de entrega ficticia](docs/prueba-entrega-ficticia.md) comprueba el paquete local del recolector privado en el motor y los gráficos reales de localhost. No añade un consumidor de datos en producción ni publica los fixtures como estadísticas. El receptor exige modo de prueba explícito.
