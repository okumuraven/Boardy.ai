FROM elixir:1.15

RUN apt-get update && apt-get install -y build-essential inotify-tools postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV HEX_HTTP_TIMEOUT=120 \
    HEX_HTTP_CONCURRENCY=1 \
    HEX_MIRROR="https://repo.hex.pm" \
    HEX_BUILDS_URL="https://repo.hex.pm" \
    MIX_ENV=prod \
    MIX_REBAR3=/usr/local/bin/rebar3

# Installed from vendor/ instead of fetched live - repo.hex.pm became
# unreachable from inside Docker's build network on two independent
# machines (confirmed directly, even with `network: host` already set
# in docker-compose.yml), so this makes the build work regardless of
# that connectivity rather than depend on it. Re-vendor only if the
# Elixir/OTP version in the FROM line above ever changes:
#   curl -o backend/vendor/hex-2.5.1.ez https://repo.hex.pm/installs/1.15.0/hex-2.5.1.ez
#   curl -o backend/vendor/rebar3 https://repo.hex.pm/installs/1.15.0-rc.0/rebar3-3.22.0
COPY vendor/hex-2.5.1.ez vendor/rebar3 /tmp/
RUN mix archive.install /tmp/hex-2.5.1.ez --force && \
    cp /tmp/rebar3 /usr/local/bin/rebar3 && chmod +x /usr/local/bin/rebar3

# Copies the whole app in one shot, including whatever deps/_build
# already exist on the host (no .dockerignore excludes them) - as long
# as mix.lock hasn't changed since those were fetched, deps.get/compile
# below recognize everything's already present and need no network
# access either. This trades away the "cache the deps layer separately"
# optimization for a build that actually works while repo.hex.pm is
# unreachable - worth restoring the two-step COPY once that's resolved.
COPY . .
RUN mix deps.get && mix deps.compile
RUN mix compile

CMD mix ecto.migrate && mix phx.server
