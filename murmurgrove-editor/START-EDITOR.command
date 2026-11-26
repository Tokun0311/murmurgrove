#!/bin/sh
cd "$(dirname "$0")" || exit 1
node _upgrade-v13/install.mjs || exit 1
exec node server.mjs
