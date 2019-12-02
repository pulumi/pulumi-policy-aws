#!/bin/bash
# publish.sh builds and publishes a release.
set -o nounset -o errexit -o pipefail

echo "Publishing to NPMjs.com:"

if [ ! -f "./src/bin/index.js" ]; then
    echo "Error: ./src/bin/index.js not found. Do you need to build?"
    exit 1
fi

node $(dirname $0)/promote.js ${@:2} < \
    ./src/bin/package.json > \
    ./src/bin/package.json.publish

cd ./src/bin/

mv package.json package.json.dev
mv package.json.publish package.json

NPM_TAG="dev"

# If the package doesn't have a pre-release tag, use the tag of latest instead of
# dev. NPM uses this tag as the default version to add, so we want it to mean
# the newest released version.
if [[ $(jq -r .version < package.json) != *-* ]]; then
    NPM_TAG="latest"
fi

# Now, perform the publish.
npm publish -tag ${NPM_TAG}
npm info 2>/dev/null

# And finally restore the original package.json.
mv package.json package.json.publish
mv package.json.dev package.json
