# Runs the site in a container: `docker compose up --build` (repo root). Production is Vercel.
# The build prerenders pages from the database, which is only reachable once compose is up,
# so the container migrates, seeds and builds when it starts instead of in the image.
FROM oven/bun:1.4.2
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["sh", "-c", "bun run db:migrate && bun run db:seed && bun run build && bun run start"]
