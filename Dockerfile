# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend with packaged static frontend
FROM maven:3.9.6-eclipse-temurin-21-alpine AS backend-build
WORKDIR /app
COPY backend/pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline -B
COPY backend/src ./src
COPY --from=frontend-build /frontend/dist ./src/main/resources/static
RUN --mount=type=cache,target=/root/.m2 mvn package -DskipTests -T 1C

# Stage 3: Optimized Container Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=backend-build /app/target/*.jar app.jar

ENV PORT=10000
EXPOSE 10000 8080
ENTRYPOINT ["sh", "-c", "java -Xmx320m -Xms128m -Xss512k -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -jar app.jar --server.port=${PORT} --server.address=0.0.0.0"]
