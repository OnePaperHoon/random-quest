#!/usr/bin/env bash
# dist/ 를 dev 서버(Caddy, /srv/sites/rouletteside.com)로 올린다. 2026-11-03 Cloudflare Workers 에서 이전.
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=root@84.247.156.126 SITE=rouletteside.com
[ -f dist/index.html ] || { echo "dist/ 가 없습니다. 먼저 빌드하세요."; exit 1; }
tar -C dist -czf - . | ssh "$HOST" "rm -rf /srv/sites/$SITE.new && mkdir -p /srv/sites/$SITE.new && tar xzf - -C /srv/sites/$SITE.new && rm -rf /srv/sites/$SITE.old && { [ -d /srv/sites/$SITE ] && mv /srv/sites/$SITE /srv/sites/$SITE.old || true; } && mv /srv/sites/$SITE.new /srv/sites/$SITE && rm -rf /srv/sites/$SITE.old"
curl -s -o /dev/null -w "https://$SITE/ -> %{http_code}\n" "https://$SITE/"
