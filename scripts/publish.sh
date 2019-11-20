#!/bin/bash
# publish.sh builds and publishes a release.
set -o nounset -o errexit -o pipefail

if [ -z ${VERSION:-} ]; then
    echo "Error: VERSION environment variable not set."
    exit 1
fi

./scripts/set-version.sh package.json ${VERSION}

npm publish -tag latest
npm info 2>/dev/null
