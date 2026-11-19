# ==============================================================
# CivicTrack Production Multi-Stage Dockerfile
# Stage 1: Build Java 21 Spring Boot executable JAR
# Stage 2: Minimal hardened Alpine JRE runtime
# ==============================================================

# --- Stage 1: Build ---
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build application
COPY src ./src
RUN mvn clean package -DskipTests -B

# --- Stage 2: Runtime ---
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Create non-root user and persistent storage mount point
RUN addgroup -S civictrack && adduser -S civictrack -G civictrack \
    && mkdir -p /var/data/uploads \
    && chown -R civictrack:civictrack /app /var/data/uploads

USER civictrack

# Copy compiled JAR from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Environment defaults
ENV PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod \
    UPLOAD_DIR=/var/data/uploads

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
