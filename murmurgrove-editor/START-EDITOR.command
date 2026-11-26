#!/bin/sh
cd "$(dirname "$0")" || exit 1
node _upgrade-v12/prepare.mjs || exit 1
exec node server.mjs
