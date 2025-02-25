#!/bin/sh

set -e

pnpm i --frozen-lockfile
pnpm update:version;

pnpm run build

npm publish

echo "✅ Publish completed"