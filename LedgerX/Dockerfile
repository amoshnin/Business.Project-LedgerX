FROM gradle:8.5-jdk21-alpine AS build
WORKDIR /app
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
# Cache deps FIRST - huge speed/win on Render
RUN chmod +x ./gradlew && ./gradlew build --no-daemon --dry-run \
    && ./gradlew dependencies --no-daemon
COPY src src
# Heap caps + verbose
ENV GRADLE_OPTS="-Xmx2g -XX:MaxMetaspaceSize=128m -Dorg.gradle.daemon=false"
RUN ./gradlew clean bootJar -x test --no-daemon --stacktrace --info

FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S spring && adduser -S spring -G spring
WORKDIR /app
USER spring:spring
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -XX:MaxRAMPercentage=75.0 -jar app.jar"]
