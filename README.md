# NBA Tendencias

Primera versión funcional en español con **React, Vite y Recharts**, estática y preparada para GitHub Pages. No utiliza servicios de pago, cuentas de prueba, bases de datos externas ni claves secretas.

## Estado de los datos

**Todos los partidos, horarios, resultados, estadísticas y plantillas iniciales son DEMOSTRACIÓN.** Los nombres de equipos y jugadores sirven para ilustrar la navegación; no acreditan plantillas vigentes. Hay 6 equipos, 18 jugadores y 7.680 registros sintéticos (320 por entidad), repartidos entre varias temporadas. No se descargan resultados reales. El generador es determinista.

### Investigación de fuentes (20 de octubre de 2026)

- [BALLDONTLIE: documentación oficial](https://docs.balldontlie.io/#account-tiers): el nivel gratuito incluye equipos, jugadores y partidos, pero Game Player Stats no está en el nivel gratuito. No se ha contratado ni conectado; no cubre gratuitamente todo el alcance.
- [nba_api](https://github.com/swar/nba_api): cliente de código abierto con licencia MIT. Su licencia de software no equivale a una autorización de redistribuir todos los datos obtenidos.
- [Condiciones de uso de NBA.com](https://www.nba.com/termsofuse): hay condiciones específicas para estadísticas y bases de datos. No se ha establecido autorización para este producto ni se ha integrado extracción automática.
- ESPN y 365Scores: referencias visuales/de contenido; no se asume permiso de scraping. No hay extractores implementados.

Por tanto, **la conexión real y la cobertura de los 30 equipos siguen pendientes**. No se confunden frecuencias con probabilidades o rentabilidad.

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
- Importación JSON/CSV en navegador, sin subir archivos. Los datos no persisten tras recargar; para persistir usa `public/data/current.json` o el adaptador autorizado.

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

CSV usa los mismos nombres de columnas; **solo contiene records**, por lo que no carga calendario. Usa comillas CSV estándar y JSON dentro de celdas `quarters`, `opponentQuarters` y `opponentStats`. Separador coma. Hay un ejemplo válido en `public/data/ejemplo.csv`. Máximo 64 MB o 100.000 registros. Los archivos importados se muestran como importados sin verificar aunque declaren `real`.

## Preparación de actualización automática

`data-source.json` está **desactivado**. `npm run update-data` no hace peticiones mientras siga así. La interfaz busca `data/current.json` y usa `demo.json` si no está disponible.

Cuando exista una fuente **gratuita y con permiso documentado para almacenar, transformar y redistribuir**:

1. Implementa la transformación al esquema anterior si la fuente no lo proporciona directamente. El adaptador actual solo descarga JSON normalizado; no conecta NBA/ESPN/365Scores.
2. Configura `data-source.json`: `enabled: true`, nombre, `url` HTTPS, `licenseUrl` y `redistributionAllowed: true`, tras comprobar las condiciones. No incrustes credenciales.
3. Ejecuta `npm run update-data`, `npm test` y `npm run build`. Un error impide reemplazar el archivo anterior. El proveedor debe declarar `meta.mode: real`.
4. Documenta permiso de la fuente original y dos comparaciones de P/R/A/triples siguiendo [el procedimiento](docs/importar-hoopr.md). El actualizador los exige antes de publicar. Versiona un `public/data/current.json` inicial válido para conservar una copia de referencia. El workflow actualiza la copia del build, no hace commits automáticos.
5. En Settings → Secrets and variables → Actions → Variables, crea `DATA_SOURCE_ENABLED=true`. Esto habilita la ejecución diaria a las 08:17 UTC. Sin esta variable el job programado se omite. La actualización se incluye en el mismo build que se publica; el JSON queda en el artefacto de Pages.

El plan no requiere gastos. No hay fuente habilitada ni promesa de datos en directo; hay que evaluar la licencia, cobertura, disponibilidad y límites del futuro proveedor. El modo real representa lo declarado por esa fuente, no una auditoría independiente.

## Próximas mejoras

Datos reales autorizados para los 30 equipos, plantillas históricas con IDs estables, tratamiento de traspasos, calendario actual, historial incremental, estadísticas parciales con valores ausentes y filtros de tendencias más avanzados. El formato acepta `entityId` estable y conserva compatibilidad con los datos de demostración anteriores; el adaptador hoopR utiliza IDs de jugador y distingue homónimos y traspasos. La muestra puede ser menor que N si no hay suficientes partidos.

## Revisión de SportsDataverse / ESPN

Se ha inspeccionado la cobertura de 2024-25 y 2025-26. **No se publican esos datos: derechos de la fuente original y precisión aún sin verificar.** La licencia CC BY 4.0 del productor no prueba por sí sola permiso de ESPN. La web sigue mostrando demostración.

- [Investigación, cobertura observada, licencias y limitaciones](docs/fuentes-nba.md).
- [Conversor local de CSV y combinación de temporadas](docs/importar-hoopr.md): `npm run import:hoopr`. No descarga datos ni publica su salida; solo permite escribir en `work/`.
- Los gráficos y filtros conservan su funcionamiento. Se admiten IDs estables, historial de traspasos, homónimos, dos o más temporadas y muestras de 100/150/200 actuaciones disponibles.
- `npm test` incluye las pruebas originales y casos nuevos del importador y los controles de publicación. Las fixtures de estas pruebas son inventadas, no resultados reales.

## Alternativas gratuitas y uso relacionado con apuestas

Se han revisado Highlightly NBA API, TheSportsDB y API-NBA. **Ninguna está aprobada para conectar y publicar datos en el uso solicitado.** API-NBA es la candidata técnica para aclarar permisos y probar cobertura; Highlightly tiene una restricción relevante sobre apuestas y TheSportsDB no acredita la cobertura gratuita necesaria.

- [Comparación de cobertura, límites, condiciones y recomendación](docs/alternativas-api-gratuitas.md).
- [Cómo guardar una posible clave gratuita en GitHub Secrets](docs/claves-api.md).

No se ha añadido una clave, un adaptador autenticado o un workflow de descarga. La demostración y la desactivación de actualizaciones se conservan.
