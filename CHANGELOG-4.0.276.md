# RavRadar 4.0.276

## Strømhistorik bevares pr. kystpunkt

- Candidate G 20/50/30 er fortsat den eneste offentlige scoremodel.
- Den private Copernicus-cache validerer nu den valgte indsamlingsdelmængde mod den fulde centrale liste over kystpunkter.
- En genindsamling af samme time erstatter kun de valgte punkter. Verificeret historik for uændrede punkter bevares.
- Flytning eller omgruppering af ét punkt fjerner kun det konkrete punkts ældre historik.
- Hver times samlingsbevis genopbygges fra de eksakte identiteter, som faktisk er bevaret. Ukendte punkter, dubletter og identitetsmismatch afvises.
- Der udføres ingen backfill, interpolation eller rekonstruktion af manglende timer.

## Dokumenteret tilstand

Den kompakte Candidate G-state var ikke gået tabt. Den dataminimerede kontrol dokumenterede cirka 36 timers sammenhængende fortsættelse ved den seneste kontrollerede reference. Den ældre brede cache var ikke sikkert sammenhængende frem til målreferencen for hele landet og bruges derfor ikke som kunstig genvej til 48 timer.

## Produktionsforløb

- PR #138 bestod exact-head-kildegaten `32787344926` på `acb59cc6` og blev merged som `72913723`.
- Push-produktion `32787715986` bestod central hydrering, frisk vejr, fuld validering, releasegate, artifact og Pages-deploy.
- De naturlige produktioner `32788514636` og `32790639192` bestod efterfølgende den fulde kæde.
- Den seneste dataminimerede livekontrol viser Candidate G-only 20/50/30, 673/673 accepterede tilstande, nul resets og lokale sammenhængende kæder på 6–39 timer. Det flyttede punkt bygger kun sin egen historik op igen; uændrede punkters historik fortsætter.
- Der var endnu 0/210 aktive zoner, fordi ingen zone var nået til et ægte komplet 48-timersvindue. Det er naturlig modning i drift og ikke en ny udviklings- eller aktiveringsgate.

## Uændret

RavScore, Candidate G's 20/50/30-formel, vejrregler, offentlig datakontrakt, zoner, kystgeometri og land-/vandpunkter er uændrede. `data/kystdata.json` og `data/zones.geojson` ændrer kun versionsfelt fra 4.0.275 til 4.0.276.
