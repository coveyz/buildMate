#!/bin/sh

set -e

pnpm i
pnpm update:version;

pnpm run build

npm publish

echo "✅ Publish completed"