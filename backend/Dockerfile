FROM elixir:1.15

RUN apt-get update && apt-get install -y build-essential inotify-tools postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV HEX_HTTP_TIMEOUT=120 \
    HEX_HTTP_CONCURRENCY=1 \
    HEX_MIRROR="https://repo.hex.pm" \
    HEX_BUILDS_URL="https://repo.hex.pm" \
    MIX_ENV=prod

RUN mix local.hex --force && \
    mix local.rebar --force

# Copy config and dependency definitions first to cache compilation
COPY mix.exs mix.lock ./
COPY config config
RUN mix deps.get && mix deps.compile

COPY . .
RUN mix compile

CMD mix ecto.migrate && mix phx.server
