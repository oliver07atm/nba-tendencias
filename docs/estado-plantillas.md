# Cobertura de plantillas y acceso inmediato a jugadores

Revisión del 20 de octubre de 2026. Esta actualización no añade pertenencias nuevas: siguen documentadas las dos revisiones parciales anteriores. No se han verificado las plantillas completas de los 30 equipos. Los datos manuales locales pueden cambiar los recuentos que veas en Datos.

## Investigación de automatización gratuita

- BALLDONTLIE: la [tabla oficial de planes](https://docs.balldontlie.io/#account-tiers) mantiene Players gratuito y Active Players de pago. El listado general no basta para certificar una plantilla activa de 2026-27. No se ha llamado al endpoint de pago ni activado un trial.
- NBA Stats: se investigó CommonTeamRoster, documentado por el [cliente nba_api](https://github.com/swar/nba_api/blob/master/docs/nba_api/stats/endpoints/commonteamroster.md). La consulta de prueba para Boston y temporada 2026-27 no fue accesible desde la herramienta web utilizada. Esto no demuestra que el servicio esté caído para todos los clientes.
- No se ha confirmado permiso de extracción automática y republicación de plantillas de [NBA.com](https://www.nba.com/termsofuse). La licencia del cliente no acredita ese permiso.

Resultado: no se ha completado una descarga automática que cumpla fuente oficial, verificación, gratuidad y permiso de reutilización. No se ha instalado un extractor ni se han presentado candidatos históricos como actuales. El calendario BALLDONTLIE diario permanece conectado, independiente de esta limitación. La actualización manual con fuentes e IDs sigue disponible en Datos.

## Recuento de pertenencias documentadas por equipo

No es el tamaño real de cada plantilla. Un cero significa **ninguna pertenencia confirmada en nuestra base**, no que el equipo carezca de jugadores. Sin una plantilla completa contrastada, no es posible dar nombres ni cantidades exactas de todos los que faltan sin inventarlos. En cada partido se muestran además todos los nombres relacionados que existan en el historial personal; esos nombres y sus estadísticas no se publican.

| Equipo | Actuales confirmados | Entradas de la base con revisión pendiente | Pendiente |
| --- | ---: | ---: | --- |
| Atlanta Hawks (ATL) | 0 | 0 | Resto sin confirmar; total desconocido |
| Boston Celtics (BOS) | 1 | 0 | Resto sin confirmar; total desconocido |
| Brooklyn Nets (BKN) | 0 | 0 | Resto sin confirmar; total desconocido |
| Charlotte Hornets (CHA) | 0 | 0 | Resto sin confirmar; total desconocido |
| Chicago Bulls (CHI) | 0 | 0 | Resto sin confirmar; total desconocido |
| Cleveland Cavaliers (CLE) | 0 | 0 | Resto sin confirmar; total desconocido |
| Dallas Mavericks (DAL) | 0 | 0 | Resto sin confirmar; total desconocido |
| Denver Nuggets (DEN) | 0 | 0 | Resto sin confirmar; total desconocido |
| Detroit Pistons (DET) | 1 | 0 | Resto sin confirmar; total desconocido |
| Golden State Warriors (GSW) | 0 | 0 | Resto sin confirmar; total desconocido |
| Houston Rockets (HOU) | 0 | 0 | Resto sin confirmar; total desconocido |
| Indiana Pacers (IND) | 0 | 0 | Resto sin confirmar; total desconocido |
| LA Clippers (LAC) | 0 | 0 | Resto sin confirmar; total desconocido |
| Los Angeles Lakers (LAL) | 0 | 0 | Resto sin confirmar; total desconocido |
| Memphis Grizzlies (MEM) | 0 | 0 | Resto sin confirmar; total desconocido |
| Miami Heat (MIA) | 0 | 0 | Resto sin confirmar; total desconocido |
| Milwaukee Bucks (MIL) | 0 | 0 | Resto sin confirmar; total desconocido |
| Minnesota Timberwolves (MIN) | 0 | 0 | Resto sin confirmar; total desconocido |
| New Orleans Pelicans (NOP) | 0 | 0 | Resto sin confirmar; total desconocido |
| New York Knicks (NYK) | 0 | 0 | Resto sin confirmar; total desconocido |
| Oklahoma City Thunder (OKC) | 0 | 0 | Resto sin confirmar; total desconocido |
| Orlando Magic (ORL) | 0 | 0 | Resto sin confirmar; total desconocido |
| Philadelphia 76ers (PHI) | 0 | 0 | Resto sin confirmar; total desconocido |
| Phoenix Suns (PHX) | 0 | 0 | Resto sin confirmar; total desconocido |
| Portland Trail Blazers (POR) | 0 | 0 | Resto sin confirmar; total desconocido |
| Sacramento Kings (SAC) | 0 | 0 | Resto sin confirmar; total desconocido |
| San Antonio Spurs (SAS) | 0 | 0 | Resto sin confirmar; total desconocido |
| Toronto Raptors (TOR) | 0 | 0 | Resto sin confirmar; total desconocido |
| Utah Jazz (UTA) | 0 | 0 | Resto sin confirmar; total desconocido |
| Washington Wizards (WAS) | 0 | 0 | Resto sin confirmar; total desconocido |

Las dos revisiones corresponden a Jayson Tatum (Boston) y Cade Cunningham (Detroit); las fuentes NBA.com, perfiles ESPN y evidencia de identidad están documentadas en la [guía](plantillas-y-navegacion.md). El resto de integrantes de esos equipos y las 28 plantillas restantes siguen sin confirmación completa.

## Qué cambia en el detalle del partido

Cada equipo tiene siempre visibles **Plantilla actual** y **Otros jugadores con estadísticas históricas**. Ambos listados ofrecen acceso directo al mismo análisis completo por ID, sin limitar la carrera al equipo del partido. También hay botones para saltar visualmente a cada equipo en móvil; no alteran las rutas ni el historial del navegador.

- Revisión reciente contrastada: pertenece al listado actual.
- Revisión de más de siete días: permanece visible en el otro listado con «Actualización pendiente · pertenencia actual no confirmada», fecha y fuente. No se borra ni se esconde.
- Asociación importada sin prueba de pertenencia: «Pertenencia actual no verificada».
- Historial en un equipo anterior y equipo actual distinto confirmado: se indica expresamente el equipo actual. No se afirma una salida o retirada sin evidencia.
- Entrada sin registros: «Sin estadísticas disponibles», sin generar estadísticas.

El estado de pertenencia no es una alineación ni una confirmación de disponibilidad. Se deduplica por identidad estable, no por coincidencia de nombres. La vista no modifica el conjunto personal ni su persistencia.

## Verificación de esta corrección

Pruebas unitarias: listas sin ocultación, revisiones antiguas aun sin historial, traspasos y 200 actuaciones entre equipos, homónimos, deduplicación, cobertura sin totales inventados y sanitización de campos de entradas pendientes que ahora se hacen visibles. Se mantienen las pruebas existentes.

Pruebas en navegador aislado: abrir un histórico directamente desde el partido y sus gráficos de puntos/rebotes/asistencias/triples; conservar filtros y desplazamiento; Atrás/Adelante y «Volver al partido»; volver a abrir enlaces; registros guardados intactos mediante huella SHA-256; revisiones antiguas visibles y pulsables; asociación al equipo anterior con aviso del actual. Se utilizó calendario real y estadísticas sintéticas etiquetadas, sin tocar la base del usuario.

Se prueba escritorio y móvil emulado en Chromium. No se afirma una prueba en un iPhone físico. Los archivos de navegación, el almacén IndexedDB personal y el actualizador del calendario no se modifican.
