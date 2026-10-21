# Auditoría del almacenamiento de NBA Stat

Revisión de `040df5a`. Solo fixtures; sin consultas NBA Stat, sin repositorios nuevos, sin ramas nuevas ni checkpoints reales.

## Hallazgo y alcance real

El adaptador anterior usaba `origin` y una rama con «private» en el nombre. En un repositorio público esa rama y sus objetos son públicos. El cifrado autenticado protege el contenido mientras la clave permanezca segura, pero no impide descargarlo, copiarlo indefinidamente o intentar descifrarlo después. Tamaños, fechas e historial también serían visibles. Borrar una rama no retira clones ni copias; comprometer posteriormente la clave comprometería snapshots anteriores. Perder la clave impediría recuperar el contenido.

Comprobación de solo lectura de las ramas de GitHub: `main`, `calendar-data`, `nbastat-probe-quota`; no existe `nbastat-sync-private-2026`. Esto verifica las referencias actuales, no demuestra la ausencia universal de objetos históricos o copias externas. No hemos creado esa rama ni subido checkpoints. No se inspeccionaron ni descifraron archivos privados del usuario. Los artefactos cifrados de las pruebas anteriores en el repositorio público tampoco deben considerarse almacenamiento de acceso privado.

El código del adaptador anterior se ha retirado y sustituido por un rechazo incondicional antes de tocar Git. No hay un interruptor que permita rehabilitarlo. El almacén local bajo `work/`, ignorado por Git, continúa disponible. No se alteran el ledger compartido de cuota ni los workflows de prueba existentes.

Otros riesgos: un runner es efímero; la caché puede caducar o ser desalojada; los artefactos y logs tienen retención y pueden borrarse. Ninguno debe ser la única copia de la cola. El checkpoint completo cifrado por cada commit crece sin aprovechar bien los deltas; no es una estrategia de volumen comprobada. Los conflictos deben detener la escritura, nunca reinicializar la cola. Un respaldo antiguo tampoco autoriza reiniciar el historial de solicitudes.

## Recomendación: repositorio privado separado, recolector privado

Preparar posteriormente un repositorio **privado**, sin Pages, para el código operativo del recolector y su estado. Ejecutar Actions allí: usar su `GITHUB_TOKEN` temporal con `contents: write` únicamente en el job de persistencia. No introducir un PAT con acceso privado en los workflows públicos. El repositorio público conserva la web y el calendario público. La entrega eventual de estadísticas autorizadas será una etapa separada, con aprobación de calidad; nunca publicará cola, respuestas crudas, identificadores pendientes, secretos o diagnósticos privados.

Los commits privados no tienen la caducidad de los artefactos y permiten conservar trabajos durante semanas sin ejecutar Actions. No son un backup independiente ni una promesa de conservación ilimitada: eliminar el repositorio, cambiar su visibilidad o perder acceso puede comprometer disponibilidad/confidencialidad. El propietario debe mantenerlo privado y restringir colaboradores y aplicaciones. Cifrar además los datos sensibles protege una copia accidental, sin reemplazar esa privacidad.

Diseño propuesto, **todavía no implementado como almacenamiento remoto**:

- Manifiesto pequeño con revisión global y trabajos por ID BDL; respuestas y revisiones normalizadas separadas por partido. No reescribir toda la temporada cifrada tras cada partido.
- Registro de transición durable: reservar cuota, descargar, guardar respuesta, validar y aplicar con IDs estables. Si falla guardar después del HTTP, la solicitud sigue consumida y el trabajo sigue pendiente.
- Comprobar mediante la API autenticada de GitHub el ID y nombre exactos del repositorio autorizado y `private: true` antes de leer o escribir. Metadatos ausentes, 403/404, repositorio público o destino diferente: bloquear antes de NBA Stat. Revalidar antes de cada escritura; no basta una variable `private=true`.
- Control optimista por commit/revisión, exclusión del recolector y reintento desde el estado persistido tras conflicto. No sobrescribir pérdidas con force-push sin comparación. Nada de recrear automáticamente un almacén que ha desaparecido.
- Mantener el mismo ledger de cuota compartido de todas las pruebas. La concurrencia de Actions **no coordina repositorios distintos**: el ledger central y sus reservas atómicas deben seguir siendo la autoridad. No crear un ledger vacío en el repositorio privado. Antes de trasladarlo haría falta detener todos los consumidores y migrar bloqueos/reservas sin reiniciarlos; esta revisión no lo hace.
- Backup cifrado local periódico con revisión, fecha y verificación de recuperación; guardar la clave fuera del repositorio, por ejemplo en un gestor de contraseñas y en Secrets. No imprimirla. Restaurar solo en destino vacío, comprobar digests y revisar antigüedad; cuota independiente, nunca restaurarla desde un backup viejo.
- Definir antes del despliegue tamaño máximo, particionado, retención de respuestas/revisiones y prueba de capacidad para una temporada. Medir crecimiento y bloquear de forma segura si no se puede persistir. La poda de historial requerirá política de recuperación; no se implementa borrado automático ahora.

## Coste y configuración manual futura

GitHub Free incluye actualmente 2.000 minutos mensuales para Actions privado y 500 MB de almacenamiento de Actions; el consumo es compartido con el resto de la cuenta. No confundir esos 500 MB con una garantía de tamaño para repositorios Git. Consultar los límites y facturación vigentes antes de activar. Usar runners Linux estándar, trabajos breves y lotes dentro de la cuota; aplazar sin dormir al agotar API o presupuesto. Un agotamiento de minutos retrasa la cola, no debe borrarla.

Para garantizar 0 €: configurar el presupuesto de Actions sin gasto adicional con **Stop usage when budget limit is reached** y comprobar su alcance en la cuenta; una alerta por sí sola no bloquea cobros. No habilitar almacenamiento adicional, runners de pago ni ampliaciones automáticas. Si la cuenta no permite confirmar el bloqueo, no activar el recolector hasta resolverlo. No se ha inspeccionado ni cambiado tu facturación.

Cuando autorices el despliegue tendrás que crear manualmente el repositorio privado, confirmar su visibilidad, configurar los secretos allí (sin compartirlos por chat), conservar una copia recuperable de la clave y revisar permisos/consumo. Ahora no necesitas crear nada. Falta implementar y comprobar el adaptador privado, el presupuesto efectivo, la coordinación entre repositorios y el backup/restauración remotos. La exportación hacia Pages necesitará credenciales separadas de alcance mínimo o un mecanismo de entrega explícito; no se habilita acceso privado desde el navegador.

## Verificación realizada y límites

Las pruebas ficticias cubren rechazo del adaptador público sin ejecutar Git, almacenamiento local/reinicio, cifrado autenticado, restauración solo en vacío, corrupción, conflictos, fallos de disco, cuota/429 y recuperación tras seis semanas. El escenario largo conserva trabajos finalizados y bloqueados omitidos por un calendario posterior, recupera su respuesta de caché, resuelve identidades localmente y aplica dos veces sin duplicar. No usa reloj real, sleeps ni HTTP real.

Esto comprueba la lógica y el formato durable. **No acredita todavía el control de acceso, límites de tamaño ni recuperación de un repositorio privado real**, porque no se ha creado ni configurado. No se han abierto ni escrito las bases IndexedDB del usuario, ni modificado los 93.224 registros, plantillas, correspondencias o retiradas. No se activa ninguna sincronización.

Fuentes oficiales consultadas:

- [Facturación y uso incluido de GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
- [Presupuestos con bloqueo de uso](https://docs.github.com/en/billing/how-tos/set-up-budgets).
- [Caducidad y desalojo de caché](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).
- [Retención de artefactos](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts).

### Preparación del ledger compartido

`githubQuotaStore({remote: 'shared-quota', requireExisting: true})` permite al futuro recolector utilizar un remoto Git explícito que apunte al repositorio **existente** del ledger. El nombre es un alias local, nunca una URL con credenciales. Si falta el ledger, se bloquea en vez de inicializar un presupuesto vacío. Los workflows actuales conservan su configuración y el ledger no se ha tocado. Las reservas siguen usando comparación de commit antes de HTTP; una carrera entre repositorios falla sin consumir otra petición. Las pruebas usan diez reservas ficticias y un bloqueo previo para confirmar que no aparece una cuota nueva.

Todavía hay que configurar y verificar que ese alias apunta exactamente al repositorio autorizado y conceder acceso de escritura mínimo al ledger; el token del repositorio privado no tiene acceso automático al público. Hasta entonces no se debe activar el recolector. No se han creado remotos, credenciales ni workflows nuevos en esta actualización.
