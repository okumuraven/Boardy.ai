FROM elixir:1.15-alpine

RUN apk add --no-cache build-base inotify-tools postgresql-client

WORKDIR /app

RUN mix local.hex --force && \
    mix local.rebar --force

COPY . .

CMD mix deps.get && mix ecto.setup && mix phx.server
