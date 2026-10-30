#!/bin/sh
# Deletes what has expired: sign-in sessions and leftovers, and Claude's access and refresh
# tokens (docs/deploy.md). Cron runs it every night in the backup helper container.
set -eu

: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is not set}"

psql "$BACKUP_DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
delete from session where expires_at < now() - interval '1 day';
delete from verification where expires_at < now() - interval '1 day';
delete from oauth_access_token where expires_at < now() - interval '1 day';
delete from oauth_refresh_token where expires_at < now() - interval '1 day';
delete from oauth_client_assertion where expires_at < now();
SQL
echo "cleanup: expired sessions and tokens deleted"
