.PHONY: dev db api web stop

# Ctrl+C stops api and web; Postgres keeps running (make stop).
dev: db
	$(MAKE) -j2 api web

db:
	docker compose up -d --wait db

api:
	cd api && air

web:
	cd web && bun dev

stop:
	docker compose stop
