# Stage 1: Build the Go binary
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Dependency layer (cached unless go.mod/go.sum change)
COPY go.mod go.sum ./
RUN go mod download

# Source layer (rebuilds on any code change)
COPY cmd/ ./cmd/
COPY internal/ ./internal/
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server/

# Download AWS RDS CA bundle in builder so runtime doesn't need curl
RUN wget -q -O /app/rds-combined-ca-bundle.pem \
    https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Stage 2: Minimal runtime image
FROM alpine:latest

RUN apk --no-cache add ca-certificates wget \
    && update-ca-certificates

# Copy the CA bundle from builder and register it
COPY --from=builder /app/rds-combined-ca-bundle.pem /usr/local/share/ca-certificates/rds-combined-ca-bundle.pem
RUN update-ca-certificates

# Create non-root user for security
RUN adduser -D -h /app appuser

WORKDIR /app
COPY --from=builder /app/server .

RUN chown appuser:appuser /app/server
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/students || exit 1

CMD ["./server"]
