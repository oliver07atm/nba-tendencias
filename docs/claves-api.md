# Clave gratuita y GitHub Secrets

Esta guía prepara una **posible evaluación futura** de API-NBA. No significa que sus derechos estén aprobados. No se han creado credenciales, workflows nuevos ni tareas automáticas.

## Conseguir y guardar la clave

Una vez aclarado el uso permitido y el coste de 0 €, abre [el dashboard oficial](https://dashboard.api-football.com/), registra tu cuenta y confirma que permanezca en el plan Free. La [guía oficial](https://www.api-football.com/news/post/how-to-get-started-with-api-nba-the-complete-beginners-guide) sitúa la clave en **Account → My Access**.

En [nba-tendencias → Settings → Secrets and variables → Actions](https://github.com/oliver07atm/nba-tendencias/settings/secrets/actions):

1. Abre **Secrets**, no Variables.
2. Pulsa **New repository secret**.
3. Nombre: **`API_SPORTS_KEY`**.
4. Pega el valor en el campo **Secret** y pulsa **Add secret**.

No hace falta compartir la clave en el chat. Si ya se ha expuesto, revócala/regénérala y actualiza el secret; borrarla de una versión del código no la vuelve segura.

## Cómo se utilizaría

La clave solo se pasará al proceso Node de una tarea manual de evaluación, no al proceso que compila React. El patrón de configuración para esa futura tarea es:

```yaml
# Fragmento ilustrativo; no es un workflow instalado.
env:
  API_SPORTS_KEY: ${{ secrets.API_SPORTS_KEY }}
```

El programa Node leería `process.env.API_SPORTS_KEY` y la enviaría en la cabecera `x-apisports-key`. No se pondría en parámetros de URL, código, comandos con valores literales, logs ni mensajes de error que impriman peticiones completas. No se adjuntarían cabeceras/credenciales a artefactos o datos de prueba.

No uses `VITE_API_SPORTS_KEY`: Vite puede incorporar esas variables al JavaScript público. GitHub Secrets protege el almacenamiento y la entrega al runner; no protege un secreto que el programa copie al bundle o a un archivo público. Tampoco se debe exponer la clave para que cada visitante llame a la API desde el navegador.

GitHub Pages sirve archivos estáticos y no guarda una clave privada en tiempo de ejecución. Una futura evaluación autorizada debería ejecutarse en Node, consumir un cupo acotado y conservar solamente una salida de revisión que no contenga secretos. Solo se servirían a los visitantes datos cuya publicación esté autorizada, validados y separados de la demostración. El script `update-data.mjs` actual descarga JSON ya normalizado: añadir este secret **no lo convierte en un adaptador de API-NBA**.

La tarea futura debe ser manual (`workflow_dispatch`), sin `schedule`, sin despliegue, sin credenciales en eventos de pull requests y con permisos mínimos. En un repositorio público, un artefacto tampoco debe tratarse como almacén privado de datos cuya redistribución no esté permitida. La primera revisión de respuestas debe realizarse en un entorno autorizado y sin publicación de estadísticas restringidas.

Referencia: [GitHub: uso de Secrets en Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

## Qué no cambia al añadir el secret

- No se habilita ninguna fuente de datos.
- No se reemplaza la demostración.
- No se activa `DATA_SOURCE_ENABLED`.
- No se debe cambiar `redistributionAllowed` ni marcar derechos o comparaciones como verificados sin evidencia.
- No se contrata ningún servicio ni se autoriza superar el plan gratuito.
