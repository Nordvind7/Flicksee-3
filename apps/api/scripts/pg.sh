#!/usr/bin/env bash
# Manage the local PostgreSQL 16 server bundled with Postgres.app.
#
# The Postgres.app *GUI* requires macOS 14, but its bundled server binaries
# run on macOS 12+ — so on older macOS we drive the server from here instead
# of the app window. Data lives in Postgres.app's standard location, so if you
# later upgrade macOS the GUI will still recognize this server.
set -euo pipefail

BIN="/Applications/Postgres.app/Contents/Versions/latest/bin"
DATADIR="$HOME/Library/Application Support/Postgres/var-16"
LOG="$DATADIR/server.log"
PORT="${PGPORT:-5432}"

if [ ! -x "$BIN/pg_ctl" ]; then
  echo "Postgres.app not found at $BIN — install it from https://postgresapp.com/" >&2
  exit 1
fi

case "${1:-status}" in
  start) "$BIN/pg_ctl" -D "$DATADIR" -l "$LOG" -o "-p $PORT" -w start ;;
  stop) "$BIN/pg_ctl" -D "$DATADIR" -w stop ;;
  restart) "$BIN/pg_ctl" -D "$DATADIR" -l "$LOG" -o "-p $PORT" -w restart ;;
  status) "$BIN/pg_ctl" -D "$DATADIR" status ;;
  *)
    echo "usage: pg.sh {start|stop|restart|status}" >&2
    exit 1
    ;;
esac
