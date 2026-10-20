# Plantillas 2026-27 para uso personal

Comprobación: 20 de octubre de 2026. Se contrastaron las listas ROSTER de las páginas oficiales de los 30 equipos: **519 pertenencias, 30 listas completas**, 17 jugadores en Boston y 18 en Detroit. Los IDs NBA se obtuvieron de los enlaces a los perfiles oficiales; no del historial importado. Es una instantánea fechada, no un seguimiento en directo ni una alineación.

## Fuente y publicación

Se localizó la [publicación de inicio de temporada](https://www.nba.com/news/nba-rosters-set-for-2026-27-regular-season) mediante búsqueda. Su apertura directa falló por tiempo de espera en esta sesión; la comprobación individual se completó en las páginas oficiales de equipo, empezando por [Boston](https://www.nba.com/team/1610612738/celtics) y [Detroit](https://www.nba.com/team/1610612765/pistons/roster).

Las [condiciones de NBA.com](https://www.nba.com/termsofuse), sección 1, no conceden permiso general para republicar contenidos en otra web. Por ello el archivo de plantillas para uso personal **no se añade al repositorio ni al build público**. No se afirma que la lectura de una página o el formato JSON conceda una licencia nueva. No se ha activado un extractor automático ni solicitado un plan de pago. BALLDONTLIE sigue limitado al calendario gratuito.

La distribución pública contiene únicamente el esquema vacío de 30 equipos y el código del importador. Las revisiones personales existentes no se borran al desplegar: se conservan en el navegador hasta que el usuario importa explícitamente otro archivo de plantillas.

## Resultado de la comprobación privada

La columna de pertenencias corresponde a la lista oficial consultada en esa fecha. No hay equipos pendientes de lectura ni pertenencias sin ID NBA en el archivo preparado. **304 identidades NBA/ESPN** se cruzaron contrastando nombre y fecha de nacimiento en la lista oficial y los perfiles/biografías ESPN indexados. Los perfiles regionales ESPN utilizan día/mes; los de www.espn.com, mes/día. ESPN solo sirve como evidencia de identidad, nunca como prueba de equipo actual. **215 cruces quedan pendientes**, no 215 pertenencias NBA.

| Equipo | Pertenencias contrastadas | IDs NBA/ESPN enlazados | IDs pendientes |
| --- | ---: | ---: | ---: |
| Atlanta Hawks (ATL) | 18 | 10 | 8 |
| Boston Celtics (BOS) | 17 | 13 | 4 |
| Brooklyn Nets (BKN) | 18 | 8 | 10 |
| Charlotte Hornets (CHA) | 18 | 6 | 12 |
| Chicago Bulls (CHI) | 17 | 9 | 8 |
| Cleveland Cavaliers (CLE) | 17 | 13 | 4 |
| Dallas Mavericks (DAL) | 17 | 7 | 10 |
| Denver Nuggets (DEN) | 17 | 9 | 8 |
| Detroit Pistons (DET) | 18 | 14 | 4 |
| Golden State Warriors (GSW) | 18 | 11 | 7 |
| Houston Rockets (HOU) | 17 | 13 | 4 |
| Indiana Pacers (IND) | 17 | 11 | 6 |
| LA Clippers (LAC) | 18 | 8 | 10 |
| Los Angeles Lakers (LAL) | 18 | 8 | 10 |
| Memphis Grizzlies (MEM) | 18 | 7 | 11 |
| Miami Heat (MIA) | 17 | 11 | 6 |
| Milwaukee Bucks (MIL) | 18 | 11 | 7 |
| Minnesota Timberwolves (MIN) | 16 | 10 | 6 |
| New Orleans Pelicans (NOP) | 18 | 10 | 8 |
| New York Knicks (NYK) | 17 | 12 | 5 |
| Oklahoma City Thunder (OKC) | 17 | 10 | 7 |
| Orlando Magic (ORL) | 17 | 7 | 10 |
| Philadelphia 76ers (PHI) | 17 | 15 | 2 |
| Phoenix Suns (PHX) | 17 | 12 | 5 |
| Portland Trail Blazers (POR) | 17 | 11 | 6 |
| Sacramento Kings (SAC) | 16 | 8 | 8 |
| San Antonio Spurs (SAS) | 17 | 10 | 7 |
| Toronto Raptors (TOR) | 16 | 9 | 7 |
| Utah Jazz (UTA) | 18 | 12 | 6 |
| Washington Wizards (WAS) | 18 | 9 | 9 |

En Boston quedan pendientes los cruces de Chris Cenac Jr., Dillon Mitchell, Luka Garza y Baylor Scheierman. En Detroit: Chaz Lanier, Isaac Jones, Ebuka Okorie y Ugonna Onyenso. Por ejemplo, la fecha publicada para Isaac Jones en NBA.com no coincide con la encontrada en ESPN: se conserva sin enlace automático. No se concluye que carezcan de actuaciones históricas; puede faltar la correspondencia de IDs. Los 215 nombres y motivos figuran en el CSV privado de pendientes entregado por separado.

## Importación sin programar

1. Guarda el archivo privado `plantillas-privadas-2026-27.json` entregado en la conversación. Para usarlo en iPhone, transfiérelo a Archivos de forma privada.
2. Abre NBA Tendencias → **Datos → Plantillas actuales → Importar plantillas JSON**. No uses el importador de estadísticas.
3. Revisa la vista previa: **519 jugadores y 30 equipos**. Si tienes revisiones de plantillas propias, puedes exportarlas antes. Pulsa **Guardar plantillas en este navegador**.
4. Vuelve a Partidos y abre Boston–Detroit: aparecen 17 y 18 jugadores respectivamente. Un jugador sin registros enlazados sigue visible y pulsable con «Sin estadísticas disponibles», indicando si falta enlazar identidad.
5. Los jugadores del historial que tienen otro equipo confirmado se separan de las pertenencias pendientes. Todos permiten abrir sus gráficos históricos, sin restringirlos al equipo actual.
6. Para completar un cruce pendiente: en Datos selecciona equipo y jugador registrado; elige su identidad del historial, comprueba ambos perfiles y fecha de nacimiento y guarda la revisión. Nunca se unen homónimos automáticamente.

La base `nba-tendencias-rosters` es independiente de `nba-tendencias-personal`. Importar plantillas no cambia registros, exportaciones de estadísticas, filtros ni las rutas del navegador. No se ha accedido al navegador personal del usuario. Las comprobaciones de persistencia usan bases aisladas: pruebas sintéticas y una conversión local de CSV ya disponibles en el espacio de investigación, nunca el navegador del usuario. Se verificaron 93.224 registros sin duplicados, huella SHA-256 idéntica tras importar plantillas, gráficos de White y Cunningham de P/R/A/triples/PRA con 200 partidos y restauración tras recargar. Esos archivos de prueba permanecen ignorados fuera del repositorio.

## Vigencia y límites

Después de siete días la evidencia pasa a actualización pendiente, sin borrar ni ocultar jugadores. Las identidades ya contrastadas conservan el enlace a todos sus equipos anteriores. La comprobación no certifica lesiones, disponibilidad, contrato futuro o cambios posteriores al 20 de octubre. No hay actualización automática de plantillas ni estadísticas individuales. Una importación JSON válida no autentica fuentes remotamente.

Las pruebas cubren evidencia del equipo correcto, temporada/fechas/IDs incompatibles, cantidades completas, homónimos, historial entre equipos, preservación de IndexedDB, jugadores sin estadísticas y la importación local. La navegación Atrás/Adelante y los filtros se comprueban en Chromium de escritorio y móvil emulado; no se afirma una prueba en iPhone físico.
