# SportRent — Sistema de Inventario y Gestión de Alquileres

> Sistema web para registro, gestión de activos (productos deportivos) y seguimiento de alquileres/tickets con panel de administración y portal de cliente.

---

## Tabla de Contenidos

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Arquitectura](#arquitectura)
3. [Tecnologías](#tecnologías)
4. [Requisitos Previos](#requisitos-previos)
5. [Guía de Instalación en Linux](#guía-de-instalación-en-linux)
   - [1. Preparar el servidor](#1-preparar-el-servidor)
   - [2. Instalar Java 21](#2-instalar-java-21)
   - [3. Instalar Maven](#3-instalar-maven)
   - [4. Instalar MySQL 8](#4-instalar-mysql-8)
   - [5. Crear la base de datos](#5-crear-la-base-de-datos)
   - [6. Instalar Nginx](#6-instalar-nginx)
   - [7. Clonar y configurar el proyecto](#7-clonar-y-configurar-el-proyecto)
   - [8. Compilar y ejecutar el Backend](#8-compilar-y-ejecutar-el-backend)
   - [9. Configurar el Frontend con Nginx](#9-configurar-el-frontend-con-nginx)
   - [10. Ejecutar el Backend como servicio systemd](#10-ejecutar-el-backend-como-servicio-systemd)
   - [11. Verificar el despliegue](#11-verificar-el-despliegue)
6. [Variables de Entorno](#variables-de-entorno)
7. [Estructura del Proyecto](#estructura-del-proyecto)
8. [Funcionalidades](#funcionalidades)
9. [API REST](#api-rest)
10. [Roles y Permisos](#roles-y-permisos)
11. [Estados de Alquiler/Ticket](#estados-de-alquilereticket)
12. [Solución de Problemas](#solución-de-problemas)

---

## Descripción del Proyecto

SportRent es una aplicación web full-stack para la gestión de inventario deportivo y el seguimiento de alquileres (tickets). Permite:

- **CRUD completo de activos (productos):** crear, consultar, editar y desactivar artículos del inventario con imágenes, especificaciones y categorías.
- **Creación y seguimiento de tickets/alquileres:** los clientes crean solicitudes de alquiler y los administradores gestionan su ciclo de vida.
- **Gestión de estados:** los alquileres transitan por estados definidos (PENDIENTE → ACTIVO → FINALIZADO / CANCELADO / VENCIDO).
- **Reportes y dashboard:** el panel de administración muestra métricas clave del negocio.
- **Autenticación JWT:** acceso diferenciado para clientes y administradores.

---

## Arquitectura

```
┌─────────────────────────────────────────────┐
│              Servidor Linux                  │
│                                              │
│  ┌──────────────┐     ┌───────────────────┐  │
│  │   Nginx      │     │  Spring Boot API  │  │
│  │  Puerto 80   │────▶│   Puerto 8080     │  │
│  │  (Frontend)  │     │   (Backend)       │  │
│  └──────────────┘     └────────┬──────────┘  │
│                                │             │
│                       ┌────────▼──────────┐  │
│                       │    MySQL 8         │  │
│                       │   Puerto 3306      │  │
│                       │   BD: sports       │  │
│                       └───────────────────┘  │
└─────────────────────────────────────────────┘
```

El frontend (HTML/CSS/JS estático) es servido por **Nginx** en el puerto 80. Las peticiones a `/api/*` son redirigidas via proxy reverso al backend en el puerto 8080. El backend (Spring Boot) se comunica con **MySQL 8** y gestiona la autenticación con **JWT**.

---

## Tecnologías

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | Java + Spring Boot | 21 / 3.3.5 |
| Seguridad | Spring Security + JWT (jjwt) | — |
| Persistencia | Spring Data JPA + Hibernate | — |
| Base de Datos | MySQL | 8.x |
| Documentación API | SpringDoc OpenAPI (Swagger) | 2.6.0 |
| Frontend | HTML5 / CSS3 / JavaScript Vanilla | — |
| Servidor Web | Nginx | 1.x |
| Build | Apache Maven | 3.9+ |

---

## Requisitos Previos

Antes de comenzar, verificar que el servidor Linux tenga:

- Ubuntu 22.04 LTS / Debian 12 (o distribución compatible)
- Acceso `sudo` o root
- Conexión a internet para descargar dependencias
- Puertos **80** y **8080** disponibles

---

## Guía de Instalación en Linux

### 1. Preparar el servidor

Actualizar el sistema e instalar herramientas base:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget unzip git
```

---

### 2. Instalar Java 21

```bash
sudo apt install -y openjdk-21-jdk
```

Verificar la instalación:

```bash
java -version
# Debe mostrar: openjdk version "21.x.x"
```

Configurar `JAVA_HOME`:

```bash
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

### 3. Instalar Maven

```bash
sudo apt install -y maven
```

Verificar:

```bash
mvn -version
# Debe mostrar: Apache Maven 3.x.x
```

---

### 4. Instalar MySQL 8

```bash
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

Ejecutar el asistente de seguridad:

```bash
sudo mysql_secure_installation
```

> Se recomienda: establecer contraseña para root, eliminar usuarios anónimos, deshabilitar login remoto de root y eliminar base de datos de test.

---

### 5. Crear la base de datos

Ingresar a MySQL como root:

```bash
sudo mysql -u root -p
```

Ejecutar los siguientes comandos SQL:

```sql
-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS sports
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Crear usuario de aplicación (más seguro que usar root)
CREATE USER 'sportrent'@'localhost' IDENTIFIED BY 'SportRent2024!';
GRANT ALL PRIVILEGES ON sports.* TO 'sportrent'@'localhost';
FLUSH PRIVILEGES;

-- Verificar
SHOW DATABASES;
EXIT;
```

> Las tablas se crean automáticamente al iniciar el backend (`ddl-auto: update`). No es necesario ejecutar scripts SQL adicionales.

---

### 6. Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

Verificar que Nginx responde:

```bash
curl -I http://localhost
# Debe responder: HTTP/1.1 200 OK
```

---

### 7. Clonar y configurar el proyecto

Clonar ambos repositorios (o copiar los archivos al servidor):

```bash
# Crear directorio de trabajo
sudo mkdir -p /var/www/sportrent
sudo chown $USER:$USER /var/www/sportrent
cd /var/www/sportrent

# Clonar el backend
git clone <URL_REPOSITORIO_BACKEND> backend

# Clonar el frontend
git clone <URL_REPOSITORIO_FRONTEND> frontend
```

> Si se trabaja con archivos ZIP, descomprimirlos en `/var/www/sportrent/backend` y `/var/www/sportrent/frontend` respectivamente.

#### Configurar el Backend

Editar el archivo de configuración de desarrollo:

```bash
nano /var/www/sportrent/backend/src/main/resources/application-dev.yml
```

Actualizar las credenciales de base de datos:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/sports
    username: sportrent          # usuario creado en el paso 5
    password: SportRent2024!     # contraseña definida en el paso 5
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.MySQL8Dialect

  servlet:
    multipart:
      enabled: true
      max-file-size: 5MB
      max-request-size: 10MB
```

Editar `application.yml` para actualizar los orígenes CORS permitidos (si el frontend se sirve desde un dominio o IP diferente a localhost):

```bash
nano /var/www/sportrent/backend/src/main/resources/application.yml
```

```yaml
app:
  cors:
    allowed-origins: "http://localhost,http://TU_IP_O_DOMINIO"
  uploads:
    dir: /var/www/sportrent/uploads    # ruta absoluta para producción
    public-base-url: /files
```

Crear el directorio de uploads y darle permisos:

```bash
sudo mkdir -p /var/www/sportrent/uploads/products
sudo chown -R $USER:$USER /var/www/sportrent/uploads
```

---

### 8. Compilar y ejecutar el Backend

Ir al directorio del backend y compilar:

```bash
cd /var/www/sportrent/backend
mvn clean package -DskipTests
```

> El proceso de compilación puede tomar 2-5 minutos la primera vez mientras descarga las dependencias.

El JAR generado estará en `target/backend-0.0.1-SNAPSHOT.jar`.

Probar la ejecución manual:

```bash
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

Si el backend inicia correctamente, verás en consola:

```
Started BackendApplication in X.XXX seconds
```

Verificar que la API responde:

```bash
curl http://localhost:8080/v3/api-docs
# Debe responder con el JSON de OpenAPI
```

Detener con `Ctrl+C` para continuar con la configuración del servicio.

---

### 9. Configurar el Frontend con Nginx

Copiar los archivos del frontend al directorio web:

```bash
sudo cp -r /var/www/sportrent/frontend/. /var/www/sportrent/html/
```

Crear la configuración de Nginx para el sitio:

```bash
sudo nano /etc/nginx/sites-available/sportrent
```

Pegar la siguiente configuración:

```nginx
server {
    listen 80;
    server_name localhost;   # Reemplazar por IP o dominio en producción

    # Servir archivos estáticos del frontend
    root /var/www/sportrent/html;
    index client/html/index.html;

    # Ruta principal
    location / {
        try_files $uri $uri/ =404;
    }

    # Proxy reverso al backend (API)
    location /api/ {
        proxy_pass         http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Proxy para archivos subidos (imágenes de productos)
    location /files/ {
        proxy_pass http://localhost:8080/files/;
    }

    # Swagger UI del backend
    location /swagger-ui/ {
        proxy_pass http://localhost:8080/swagger-ui/;
    }

    # Logs
    access_log /var/log/nginx/sportrent_access.log;
    error_log  /var/log/nginx/sportrent_error.log;
}
```

Activar el sitio y deshabilitar el sitio por defecto:

```bash
sudo ln -s /etc/nginx/sites-available/sportrent /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar la sintaxis de la configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

### 10. Ejecutar el Backend como servicio systemd

Crear el archivo de servicio para que el backend inicie automáticamente con el sistema:

```bash
sudo nano /etc/systemd/system/sportrent-backend.service
```

Pegar el siguiente contenido:

```ini
[Unit]
Description=SportRent Backend (Spring Boot)
After=network.target mysql.service
Requires=mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/sportrent/backend

# Variables de entorno de producción
Environment="SPORTS_JWT_SECRET=cambiar-por-clave-secreta-segura-minimo-32-caracteres"
Environment="SPORTS_UPLOADS_DIR=/var/www/sportrent/uploads"
Environment="SPRING_PROFILES_ACTIVE=dev"

ExecStart=/usr/bin/java \
  -jar /var/www/sportrent/backend/target/backend-0.0.1-SNAPSHOT.jar \
  --server.port=8080

# Reinicio automático ante fallos
Restart=on-failure
RestartSec=10

# Logs del sistema
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sportrent-backend

[Install]
WantedBy=multi-user.target
```

Ajustar permisos del directorio para el usuario `www-data`:

```bash
sudo chown -R www-data:www-data /var/www/sportrent
```

Habilitar e iniciar el servicio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sportrent-backend
sudo systemctl start sportrent-backend
```

Verificar que el servicio está corriendo:

```bash
sudo systemctl status sportrent-backend
# Debe mostrar: Active: active (running)
```

Ver los logs en tiempo real:

```bash
sudo journalctl -u sportrent-backend -f
```

---

### 11. Verificar el despliegue

Ejecutar las siguientes verificaciones para confirmar que todo funciona:

```bash
# 1. Backend responde
curl -s http://localhost:8080/v3/api-docs | python3 -m json.tool | head -5

# 2. Frontend accesible por Nginx
curl -I http://localhost/client/html/index.html

# 3. Proxy API a través de Nginx
curl -s http://localhost/api/products | head -100

# 4. Estado de los servicios
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status sportrent-backend
```

Acceder desde el navegador:

| Recurso | URL |
|---|---|
| Portal Cliente | `http://TU_IP/client/html/index.html` |
| Panel Admin | `http://TU_IP/admin/html/admin_dashboard.html` |
| Swagger UI | `http://TU_IP/swagger-ui/index.html` |

---

## Variables de Entorno

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `SPORTS_JWT_SECRET` | Clave secreta para firmar tokens JWT (mínimo 32 caracteres) | Valor en `application.yml` |
| `SPORTS_UPLOADS_DIR` | Ruta del directorio donde se almacenan imágenes subidas | `uploads` (relativo al JAR) |
| `SPRING_PROFILES_ACTIVE` | Perfil de Spring activo | `dev` |

> **Importante en producción:** cambiar siempre `SPORTS_JWT_SECRET` por una cadena aleatoria segura. Nunca usar el valor por defecto.

Generar una clave segura:

```bash
openssl rand -base64 48
```

---

## Estructura del Proyecto

```
sportrent/
├── backend/                          # Spring Boot API
│   ├── src/main/java/com/sports/backend/
│   │   ├── config/                   # CORS, Seguridad, OpenAPI, Seeds
│   │   ├── controller/               # Endpoints REST
│   │   ├── dto/                      # Objetos de transferencia de datos
│   │   ├── model/                    # Entidades JPA (tablas de BD)
│   │   ├── repository/               # Repositorios Spring Data
│   │   ├── security/                 # JWT Filter y Service
│   │   └── service/                  # Lógica de negocio
│   └── src/main/resources/
│       ├── application.yml           # Configuración base
│       └── application-dev.yml       # Configuración de BD y entorno
│
└── frontend/                         # UI estática HTML/CSS/JS
    ├── client/
    │   ├── html/                     # Páginas del portal de cliente
    │   ├── css/                      # Estilos del cliente
    │   └── js/                       # Scripts del cliente
    ├── admin/
    │   ├── html/                     # Páginas del panel de administración
    │   ├── css/                      # Estilos del admin
    │   └── js/                       # Scripts del admin
    └── img/                          # Imágenes estáticas del proyecto
```

---

## Funcionalidades

### Portal de Cliente
- Registro e inicio de sesión con JWT
- Recuperación de contraseña
- Catálogo de productos con filtro por categoría
- Detalle de producto con especificaciones e imágenes
- Agregar al carrito y flujo de checkout
- Historial de alquileres personales (tickets)
- Detalle y extensión de alquiler activo
- Lista de favoritos
- Ticket/confirmación de alquiler

### Panel de Administración
- Dashboard con métricas (ingresos, alquileres activos, usuarios, ocupación por categoría)
- Gestión de inventario: crear, editar, desactivar productos
- Gestión de alquileres: ver, cambiar estado, filtrar
- Gestión de usuarios: crear, editar, activar/desactivar
- Creación manual de alquileres para clientes

---

## API REST

La documentación interactiva completa está disponible en Swagger UI una vez desplegado el sistema:

```
http://TU_IP/swagger-ui/index.html
```

Principales grupos de endpoints:

| Prefijo | Descripción |
|---|---|
| `POST /api/auth/login` | Autenticación, devuelve JWT |
| `POST /api/auth/register` | Registro de nuevo cliente |
| `GET  /api/products` | Listar productos (público) |
| `POST /api/admin/products` | Crear producto (solo ADMIN) |
| `GET  /api/rentals/my` | Alquileres del cliente autenticado |
| `POST /api/rentals` | Crear alquiler/ticket |
| `GET  /api/admin/rentals` | Todos los alquileres (solo ADMIN) |
| `GET  /api/admin/dashboard` | Métricas del dashboard (solo ADMIN) |

---

## Roles y Permisos

| Rol | Acceso |
|---|---|
| `CLIENT` | Portal de cliente: catálogo, carrito, mis alquileres, perfil |
| `ADMIN` | Panel de administración: inventario, alquileres, usuarios, reportes |

---

## Estados de Alquiler/Ticket

```
  PENDIENTE ──▶ ACTIVO ──▶ FINALIZADO
      │                         
      └──▶ CANCELADO
  
  ACTIVO ──▶ VENCIDO  (automático por tarea programada)
```

| Estado | Descripción |
|---|---|
| `PENDIENTE` | Alquiler creado, pendiente de confirmación |
| `ACTIVO` | Alquiler en curso, producto entregado |
| `FINALIZADO` | Alquiler completado correctamente |
| `CANCELADO` | Alquiler cancelado por cliente o administrador |
| `VENCIDO` | El alquiler superó la fecha de devolución sin cerrarse |

---

## Solución de Problemas

### El backend no inicia: `Could not create connection to database server`

Verificar que MySQL está corriendo y las credenciales son correctas:

```bash
sudo systemctl status mysql
mysql -u sportrent -p -e "USE sports; SHOW TABLES;"
```

### Error `Access Denied for user 'root'@'localhost'` en MySQL

Asignar privilegios correctamente:

```bash
sudo mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'tu_password';
FLUSH PRIVILEGES;
```

### Nginx devuelve `502 Bad Gateway` en `/api/`

El backend no está corriendo. Verificar el servicio:

```bash
sudo systemctl status sportrent-backend
sudo journalctl -u sportrent-backend --since "5 minutes ago"
```

### El frontend no puede hacer peticiones a la API (error CORS)

Verificar que el origen del frontend está incluido en `app.cors.allowed-origins` dentro de `application.yml` y reiniciar el backend.

### Puerto 8080 ya en uso

Identificar y detener el proceso que ocupa el puerto:

```bash
sudo lsof -i :8080
sudo kill -9 <PID>
```

### Imágenes de productos no se muestran

Verificar que la ruta de uploads es correcta y tiene permisos de lectura para `www-data`:

```bash
sudo chown -R www-data:www-data /var/www/sportrent/uploads
sudo chmod -R 755 /var/www/sportrent/uploads
```

---

## Créditos

Proyecto de Aula — Materia Optativa I  
Sistema de Inventario + Tickets (CRUD de activos, gestión de alquileres, estados y reportes)
