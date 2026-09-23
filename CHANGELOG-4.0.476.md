# RavRadar 4.0.476 – korrekt tom historik ved regional fastholdelse

Providerfri run `35871154038` målte checkpointets faktiske
afvisning: otte integrerede tilstande fik SQL-kode `I04` og hele
pakken `P02`. Den gamle SQL-regel afviser en senere time med tom
evidens, selv om en eksakt regional DMI-fastholdelse i scoremodellen
kan bevare den som MISSING. Det er en stærk forklaring på de otte
afvisninger, men ikke et bevis for hver privat kystdels konkrete årsag.
En tom time er ikke en ny strømværdi.

En append-only Supabase-migration samordner validator og sikker
fejldiagnose med modellen. Senere tomme timer kan bevares frem til
tilstandens egen tid; senere talværdi uden ny verificeret måling
forbliver afvist. Readback-kontrakten og migrationsinstallationen
følger den nye aktive funktion. De anvendte migrationer ændres ikke.

Den eksisterende regel for de otte godkendte Limfjordsdele er
efterprøvet fra regional vejrkilde til score: højst tre timer fra en
ægte måling, uden opdigtet vektor eller ekstra transport. En ældre
regional test-fixture fik det krævede `sha256:`-præfiks; den
underliggende vejrhentning blev ikke ændret.

Diagnosen klassificerer også uventede, men faste årsagskoder mere
præcist uden at logge private data. Ingen leverandør, scoreformel,
geometri, kildeprioritet eller offentlig vejrdata ændres. De senest
målte 5.201 havstrømshuller og den lave DMI/Copernicus-andel er
fortsat åbne til normal vejrhentning.
