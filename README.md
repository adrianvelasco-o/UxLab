# GesLab — Sistema de Gestión del Laboratorio de Experiencia de Usuario (UXLab)

> **Institución Universitaria Colegio Mayor del Cauca**  
> Facultad de Ingeniería — Ingeniería Informática  
> Popayán, Cauca, Colombia — 2026

GesLab es una plataforma de software orientada a la gestión, administración y control operativo de las prácticas de usabilidad realizadas en el UXLab del Colegio Mayor del Cauca, desarrollada bajo estándares de accesibilidad **WCAG 2.1 (Niveles A y AA)**.

---

## 🚀 Arquitectura Tecnológica

- **Backend**: Node.js (ES Modules), Express 4.x, Prisma ORM 5.x.
- **Base de Datos**: PostgreSQL 15 relacional con integridad referencial.
- **Seguridad**: Autenticación JWT, cifrado Bcrypt, control de acceso basado en roles (RBAC), Helmet, Express Rate Limit y esquemas de validación Zod.
- **Frontend**: React 18, Vite 5, Nginx como proxy inverso y arquitectura CSS accesible.
- **Contenerización**: Docker y Docker Compose para despliegue multiplataforma.

---

## 📋 Estructura del Repositorio

```text
GesLab/
├── backend/                  # Servidor Express, Prisma ORM, rutas y lógica de dominio
│   ├── prisma/               # Esquema de base de datos y migraciones
│   ├── src/                  # Módulos: auth, usuarios, practicas, documentos, reservas...
│   ├── tests/                # Suites de pruebas con Jest y Supertest
│   └── Dockerfile            # Construcción del contenedor backend
├── frontend/                 # Cliente web SPA en React con Vite
│   ├── src/                  # Componentes, páginas, contexto y servicios accesibles
│   ├── nginx.conf            # Configuración de proxy inverso para producción
│   └── Dockerfile            # Construcción del contenedor frontend
├── docker-compose.yml        # Orquestación de servicios (BD, Backend, Frontend)
├── .env.docker.example       # Plantilla de variables de entorno para Docker
├── .gitignore                # Reglas de exclusión de archivos sensibles
└── README.md                 # Documentación técnica de inicio rápido
```

---

## 🛠️ Puesta en Marcha Rápida (con Docker Compose)

### 1. Prerrequisitos
- [Docker](https://www.docker.com/) y Docker Compose instalados.
- Puerto `8080` (Frontend), `3000` (Backend) y `5432` (PostgreSQL) libres.

### 2. Configuración de Entorno
Copiar la plantilla de variables de entorno en la raíz del proyecto:
```bash
cp .env.docker.example .env
```
*(Personalizar los valores de contraseñas y claves JWT según sea necesario).*

### 3. Levantar los Servicios
```bash
docker compose up -d --build
```

### 4. Acceso a la Aplicación
- **Cliente Web**: [http://localhost:8080](http://localhost:8080)
- **API REST Backend**: [http://localhost:3000/api](http://localhost:3000/api)
- **Healthcheck**: [http://localhost:3000/api/salud](http://localhost:3000/api/salud)

---

## 🧪 Ejecución de Pruebas Automatizadas

Para ejecutar las pruebas del backend en local:
```bash
cd backend
npm install
npm test
```

---

## ♿ Accesibilidad (WCAG 2.1)

El desarrollo del frontend sigue rigurosamente las pautas de accesibilidad para el contenido web WCAG 2.1 (Nivel AA), garantizando:
- Operabilidad completa mediante teclado y foco visualmente distinguible.
- Información no dependiente exclusivamente del color (adaptación para daltonismo y baja visión).
- Estructura semántica HTML5 y compatibilidad con lectores de pantalla (WAI-ARIA).
- Contraste de texto y componentes superior a 4.5:1.

---

## 📄 Licencia y Derechos

© 2026 Institución Universitaria Colegio Mayor del Cauca. Todos los derechos reservados.
Desarrollado como proyecto de Trabajo de Grado en Ingeniería Informática.
