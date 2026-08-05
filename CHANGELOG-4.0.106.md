# RavRadar 4.0.106

## Rettet
- `QuotaExceededError` i browserens `localStorage` kan ikke længere afbryde valg, fjernelse eller visning af administratorvalgte vandstandskilder.
- Store, skrivebeskyttede dokumenter som stationsregister og runtime-diagnostik caches ikke længere i `localStorage`. De læses fra Supabase eller projektdata og holdes i hukommelsen.
- Forældede store `ravradar-admin-document:*`-cacher ryddes automatisk ved opstart.
- Lokal cache er nu kun en hjælpefunktion. Hvis browserens kvote stadig er fuld, fortsætter den centrale Supabase-gemning, og kortet opdateres straks.
- Både den prioriterede indlæsning og `saveWaterRouting()` bruger kvotesikre lokale writes.

## Uændret
- DMI-data, vandstandsprognoser, automatisk routing, geografisk interpolation, Supabase-dokumentformat, RavScore og offentlig visning er ikke ændret.
