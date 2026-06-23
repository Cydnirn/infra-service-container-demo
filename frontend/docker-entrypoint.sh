#!/bin/sh
set -e

# Inject REACT_APP_API_URL into a runtime config script.
# The app reads window.__REACT_APP_API_URL__ at startup.
API_URL="${REACT_APP_API_URL:-http://localhost:8080}"

cat > /usr/share/nginx/html/env-config.js << EOF
window.__REACT_APP_API_URL__ = "${API_URL}";
EOF

echo "env-config.js written with API_URL=${API_URL}"

exec "$@"
