# Etapa 1: Construcción
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Compilar el proyecto
RUN npm run build

# Etapa 2: Ejecución
FROM node:18-alpine AS runner

WORKDIR /app

# Instalar dependencias de producción únicamente
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copiar archivos compilados y públicos desde la etapa de construcción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Exponer el puerto de la aplicación
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/main.js"]
