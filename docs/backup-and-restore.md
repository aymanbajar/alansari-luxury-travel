# Backup And Restore

## Backup

Backups use `pg_dump` and the `DATABASE_URL` environment variable.

```powershell
$env:DATABASE_URL="postgresql://user:password@host:5432/alansari"
.\scripts\db-backup.ps1 -OutputFile .\backups\alansari-2026-07-19.dump
```

Store backups encrypted in managed storage. Restrict access to authorized operators only.

## Restore

Restore only into the intended target database:

```powershell
$env:DATABASE_URL="postgresql://user:password@host:5432/alansari_restore"
.\scripts\db-restore.ps1 -InputFile .\backups\alansari-2026-07-19.dump
```

After restore:

```bash
npm run prisma:deploy
npm run db:validate --workspace @alansari/api
```

## Verification

Verify:

- Admin login.
- Booking search.
- Availability check.
- Dashboard summary.
- Daily report preview.
- Latest audit logs.

## Retention

Recommended minimum:

- Daily backups retained for 30 days.
- Weekly backups retained for 12 weeks.
- Monthly backups retained for 12 months.

Adjust to company policy and legal requirements.

## Seed Restrictions

Run seed scripts only in development or disposable staging environments. Never run development seed credentials in production.
