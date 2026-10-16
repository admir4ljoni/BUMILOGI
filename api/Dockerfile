# Go API: static binary on a small Alpine base (wget kept for the healthcheck).
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=docker
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /api .

FROM alpine:3.22
RUN adduser -D -u 10001 app
USER app
COPY --from=build /api /api
EXPOSE 8080
ENTRYPOINT ["/api"]
