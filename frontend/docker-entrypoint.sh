#!/bin/sh
set -e

# In SSR mode the React Router server reads API_URL from the
# environment. This script allows overriding it at container start
# via REACT_APP_API_URL (legacy) or API_URL directly.
: "${API_URL:=${REACT_APP_API_URL:-http://student-backend:8080}}"
: "${PORT:=80}"

export API_URL
export PORT

echo "Starting frontend server (API_URL=${API_URL}, PORT=${PORT})"

exec npx react-router-serve ./build/server/index.js
