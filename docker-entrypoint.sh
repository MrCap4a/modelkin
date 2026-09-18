#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
# Invoke the real script directly rather than the node_modules/.bin/prisma
# shim: the bundled CLI locates its sibling prisma_schema_build_bg.wasm
# relative to its own file location, and resolves that relative to the
# symlink's directory (node_modules/.bin/) instead of the real target
# (node_modules/prisma/build/) when run through the symlink — resulting in
# an ENOENT for the wasm file. Calling the real path sidesteps this.
node ./node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Starting application..."
exec "$@"
