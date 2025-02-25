#!/bin/sh

set -e

pnpm i

pnpm update:version
pnpm gen:version

pnpm run build

npm publish

echo "✅ Publish completed"