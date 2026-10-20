# Importación local de históricos (pendiente de autorización para publicar)

Este adaptador **no descarga ni publica datos**. Recibe tres CSV locales de una fuente con el esquema inspeccionado de hoopR. La web pública sigue con DEMOSTRACIÓN. Para evaluar o usar un archivo local también debes comprobar que tu uso esté permitido; el comando no concede ninguna licencia.

## Convertir una temporada

Con Node.js 22.12+ y `npm ci`:

```bash
npm run import:hoopr -- \
  --players work/entrada/player_box_2025.csv \
  --teams work/entrada/team_box_2025.csv \
  --schedule work/entrada/nba_schedule_2025.csv \
  --out work/imports/2024-25.json
```

`2025` es el año final y se convierte a `2024-25`; `2026` equivale a `2025-26`. No se incluyen datos reales de terceros entre los archivos de ejemplo/pruebas del repositorio. El comando no crea las entradas.

La salida solo puede estar dentro de `work/`, que Git ignora. Genera el JSON compatible con la aplicación y un `.report.json` con recuentos, exclusiones y hasta 30 ejemplos de incidencias (el total completo está en `issuesCount`). No se escribe en `public/` ni `dist/`, incluso si se pasa una ruta de esas carpetas. Los registros generados se etiquetan `mode: imported`, `origin: historical-unverified`, `rights.status: unresolved` y `accuracy.status: unverified`.

Los partidos terminados forman el histórico de actuaciones; **no** se presentan como próximos partidos. El JSON del conversor tiene `schedule: []`. Para tendencias de próximos partidos hará falta un calendario futuro autorizado. Los gráficos de jugadores/equipos no necesitan ese calendario.

El conversor conserva las estadísticas disponibles sin imputar valores. Omite DNP y actuaciones sin campos obligatorios; no convierte minutos desconocidos en cero. Los minutos de equipos se derivan como 240 más 25 por prórroga, no son una lectura de minutos individuales del origen. Los totales de pérdidas de equipos usan `total_turnovers`, incluyendo pérdidas del equipo, mientras las pérdidas de jugadores usan `turnovers`.

## Combinar temporadas

```bash
npm run import:hoopr -- \
  --players work/entrada/player_box_2026.csv \
  --teams work/entrada/team_box_2026.csv \
  --schedule work/entrada/nba_schedule_2026.csv \
  --merge work/imports/2024-25.json \
  --out work/imports/2024-26.json
```

Repite el proceso para añadir una tercera temporada. La clave estable `entityId` mantiene al jugador aunque cambie de nombre de presentación o equipo. Cada actuación usa partido+jugador; una copia idéntica se deduplica, un conflicto se rechaza. La unión siempre queda como importada sin verificar y no mezcla demostración con histórico. El reporte corresponde al nuevo lote; el total de registros combinado aparece en la salida del comando.

La interfaz mantiene sus filtros y permite elegir 100, 150 o 200 partidos una vez que existan registros suficientes. La importación manual desde Datos carga un único conjunto completo en memoria y reemplaza el conjunto anterior, sin persistir tras recargar. No se combinan archivos automáticamente desde el navegador. Límite: 64 MB y 100.000 registros; todavía no hay fragmentación de carga.

## Revisar antes de habilitar datos públicos

1. Documentar permiso de la **fuente original**, con alcance para almacenar, transformar y redistribuir públicamente. Conservar también la licencia del repositorio y las atribuciones necesarias. `docs/fuentes-nba.md` explica el bloqueo actual con ESPN.
2. Comparar al menos dos encuentros concretos con páginas/documentos originales: identificar partido y jugador, contrastar puntos, rebotes, asistencias y triples, registrar diferencias y fecha de comprobación. Una copia derivada del mismo archivo no basta. Resolver las diferencias antes de marcar coincidencia.
3. Revisar el reporte de exclusiones, conciliación de partidos esperados y cobertura de la temporada. No basta con que el parser termine correctamente.
4. Preparar un JSON autorizado y añadir evidencia a `data-source.json`, manteniendo `enabled: false` hasta finalizar la revisión. El esquema de evidencia de configuración es:

```json
{
  "rights": {
    "status": "verified",
    "originalSourcePermissionUrl": "https://fuente-autorizada.example/permiso",
    "reviewedAt": "AAAA-MM-DD",
    "scope": ["public-redistribution"]
  }
}
```

El JSON público también deberá declarar `meta.mode: real`, `meta.origin: historical`, `meta.rights.status: verified` y evidencia de las comparaciones:

```json
{
  "accuracy": {
    "status": "verified",
    "comparisons": [
      {
        "gameId": "ID-del-partido",
        "playerId": "ID-del-jugador",
        "checkedAt": "AAAA-MM-DD",
        "sourceUrl": "https://fuente-autorizada.example/partido",
        "metrics": ["points", "rebounds", "assists", "threeMade"],
        "matched": true
      }
    ]
  }
}
```

Este ejemplo es **solo un esquema**, sin evidencia real: el control requiere dos IDs de partido distintos y las cuatro métricas. No basta renombrar `imported` a `real`: el permiso y las comparaciones deben existir y revisarse, además de cumplir la forma técnica.

5. Con todos los requisitos satisfechos, configurar la URL gratuita del JSON normalizado, su licencia y evidencia, probar `npm run update-data`, `npm test` y `npm run build`. No se ha habilitado ninguna URL. El mecanismo diario de Actions ya existente se conserva desactivado.
