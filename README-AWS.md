# Publicar MeteRSit en AWS

## 1. Crear la tabla

En AWS CloudFormation, crea una pila usando `aws-dynamodb.yaml`. La tabla se llamara `metersit-visitantes`.

## 2. Crear el servicio

En AWS App Runner:

1. Selecciona **Create service**.
2. Elige **Source code repository** y conecta GitHub.
3. Selecciona `Batt00sai/feria-prototipo` y la rama `main`.
4. Runtime: **Node.js 18** o superior.
5. Build command: `npm install`.
6. Start command: `npm start`.
7. Port: `3000`.

## 3. Variables de entorno

Configura estas variables en App Runner:

```text
AWS_REGION=us-east-1
DYNAMODB_TABLE=metersit-visitantes
```

Asigna al rol de instancia de App Runner permisos `dynamodb:Scan`, `dynamodb:PutItem` y `dynamodb:DeleteItem` únicamente sobre la tabla `metersit-visitantes`.

## 4. QR fijo

Cuando App Runner entregue la URL HTTPS, abre:

```text
https://TU-SERVICIO.awsapprunner.com/qr.html
```

Descarga ese QR. Siempre abrirá `/`, luego el visitante se registra y continúa a la presentación.

El dashboard queda en:

```text
https://TU-SERVICIO.awsapprunner.com/dashboard.html
```
