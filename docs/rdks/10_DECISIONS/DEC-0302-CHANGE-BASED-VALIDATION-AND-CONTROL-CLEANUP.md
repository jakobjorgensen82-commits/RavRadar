# DEC-0302 – Ændringsbaseret validering og oprydning i kontroller

**Dato:** 2026-10-30
**Status:** Ejerbeslutning; teknisk indførelse under forberedelse
**Besluttet af:** Ejeren gennem direkte instruktioner i den aktuelle samtale

## Beslutning

Testomfanget skal følge ændringens faktiske påvirkning og relevante afhængigheder. Uændrede, uvedkommende områder skal ikke automatisk udløse dybe prøver. Korte prøver af den normale kæde kommer tidligt; overflødige, gentagne og erstattede kontroller fjernes fra den normale leveringsvej.

Princippet gælder hele forløbet: kildekontrol, databasekontrol, nationale prøver, build, upload og deploy. En kontrol skal beskytte et konkret krav og være relevant for den aktuelle ændring. Mængden af grønne kontroller er ikke et selvstændigt kvalitetsmål.

## Konkret testplan for hver levering

1. Vurdér hele den faktiske kildeændring og dens reelle direkte og indirekte afhængigheder. En lille diff er ikke automatisk lille risiko.
2. Vælg de relevante eksisterende mål og nødvendige korte fælles integritetskontroller. En ny regression skal faktisk være registreret i leveringsvejen.
3. Kør en kort prøve gennem den normale berørte kalder tidligt, før de dyre kontroller. Brug eksisterende gyldige gemte data eller relevante syntetiske fixtures uden at fabrikere produktionsproveniens.
4. SQL, model-, state- og checkpointændringer får relevante dybe prøver. Et ikke-berørt databasedomæne markeres ikke relevant for denne ændring; det påstås aldrig udført eller genbrugt uden bevis.
5. Ukendt eller fælles påvirkning udvider omfanget. En kendt relevant fejl forbliver rød.
6. Samlet tidsforbrug og den normale prøves faktiske dækning skal kunne vurderes. Mål i de nødvendige kørsler frem for ekstra fulde prøver kun til måling.

## Historik og oprydning

Gennemgå og fjern eller flyt aktuelle prøver, der er gentagelser, forældede eller erstattet af bedre beskyttelse. Historiske uforanderlige kildebanker, SQL-originaler og deres autenticitet bevares. De er forskellige fra en aktuel test, der alene kræver gammel package-tekst eller en gammel workflowstreng ved en legitim ombygning. En gammel nyttig beskyttelse må først udgå, når det er konkret dokumenteret, hvordan kontrakten fortsat dækkes.

Gyldig tidligere evidens kan bruges for uændrede relevante input og forudsætninger. Udførelse, genbrug og ikke-berørt scope er tre forskellige udsagn og skal beskrives ærligt. Gamle V1-receipts ommærkes ikke til V2; et nyt testvalg er ikke et nyt SQL-bevis.

## Produktion og leveringsgrænser

Nye friske produktionsartifact bevarer relevante fulde data-, original-, modelbindings-, privacy-, no-loss-, release- og deploykontroller. Source-/SQL-testvalg må ikke give adgang til datatab, falsk provenance, ændret kildeprioritet, admin/geometri, scoreformel eller omgåelse af konkrete afvisninger. Ingen produktionsændring under aktiv writer.

Denne beslutning erstatter ældre blanketformuleringer om samme brede source-/databasepakke ved enhver rettelse som arbejdsprincip. Den er ikke i sig selv en teknisk ændring af eksisterende gateprotokoller og giver ikke ret til at kalde en uafsluttet eller rød kvalifikation grøn. Den tekniske ændring får egen gennemgået integration og relevant kvalifikation; det igangværende vejrrettelsesforløb fortsætter på sin allerede igangsatte kvalifikation.

## Aktuel implementeringsstatus

De første lokale efterbilleder retter hård bindingpreflight, tilføjer normale tidsrækker og placerer den normale overgangsprøve tidligt uden at ændre stepnumre. De er ikke installeret. Den egentlige ændringsplan, verificeret fuld diff/baseline, gate-/proofintegration, målrettet oprydning og faktisk hurtigere levering med bevaret fejlfangst er åbne. Detaljeret, skiftende run- og testbevis føres privat.

## Placering af hukommelse

RDKS er beslutningskilden; AGENTS og CODEX_START_HERE giver kort obligatorisk indgang. Målet behøver kun et stabilt princip og henvisning, ikke kopier af hele den skiftende testplan. Checkpointet gemmer faktisk leveret/forberedt status og næste konkrete trin. Alle fem hovedmål og fristen 18. november 2026 bevares.
