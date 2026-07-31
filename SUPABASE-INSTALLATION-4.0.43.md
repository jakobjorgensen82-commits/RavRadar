# Supabase-installation – RavRadar 4.0.44

Kør kun denne ene fil i Supabase SQL Editor:

`supabase/INSTALL-RAVRADAR-4.0.44.sql`

Filen er genkørbar og ændrer ikke `observations` eller andre ældre datatabeller. Dermed undgår den konflikten mellem ældre `bigint`-ID'er og nyere `uuid`-ID'er.

Det sidste resultat skal vise:

- `installed = true`
- `owner_count = 1`

Du skal ikke køre `schema.sql`, `RavRadar-4.0.41-permissions.sql` eller `RavRadar-4.0.42-central-storage-and-permissions.sql` for at installere central adminlagring i 4.0.44.
