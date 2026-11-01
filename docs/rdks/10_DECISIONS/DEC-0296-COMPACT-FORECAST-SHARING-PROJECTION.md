# DEC-0296 – Kompakt offentlig prognosedeling uden ny scoreberegning

**Dato:** 2026-10-29
**Status:** AKTIV afgrænset lokal leveringsbeslutning; samlet kildekvalifikation, offentlig levering og hosted accept er åbne.

## Sammenhæng med den godkendte delingsvej

DEC-0294s separate Pages/Functions-projekt og senere én Simply-CNAME bevares. Denne beslutning præciserer en mindre offentlig datarepræsentation, som kan bruges af både den godkendte Pages-host og den eksisterende legacy-Worker. Hvor den ældre tekst beskriver læsning af den store zonepakke og register, er den nye kompakte læsevej efterfølgeren. Ingen DNS-, TLS-, host- eller klientovergang udføres af denne kildeforberedelse.

Kompakt deling samles med den allerede udstedte 592-kandidat før én præcis samlet source-CI. Den prioriterede tailrettelse beholder sin særskilte kvalifikation og leveringsrækkefølge. Formatet kræver ikke en ny version, C/I/T/K, scoreformel eller migration. Det skal følge den faktisk aktive models binding; 592-overgangens egne original-, SQL-, senere-H0- og no-loss-gates bevares.

## Fast projektion af allerede beregnede data

- Ét kompakt indeks over de 210 zoner og én offentlig fil pr. zone. Hver zonefil omfatter præcis den forventede 118-timersakse og begge søgemåder. Det er 211 filer i et nyt artifact, ikke billeder eller separate filer pr. zone og time.
- Der køres ingen ny score. For alle 118 × 210 × 2 valg skal delingskontraktens tidspunkt, tilgængelighed, scoretal, kvalitetsmarkering og lokale dækningsstatus være identiske med de bundne normale offentlige resultater. 49.560 lige resultater betyder paritet, ikke fuld vejrdækning.
- Normalproducenten genbruger sine allerede beregnede detailsDocument/detailsText/manifest-referencer i stedet for at genlæse og JSON-fortolke den store detailfil. Teksthashning sker i afgrænsede UTF-8-sikre bidder. Det interne producentobjekt er ikke selvstændig autenticitet eller en erstatning for diskbinding og efterkontrol. CLI-/kodekopieringsveje beholder deres eksisterende filbaserede arm.
- De obligatoriske normale artifact- og privacykontroller omfatter indeks og alle 210 zonefiler samt fuld paritet mod de bundne offentlige diskdata. Ingen ny fil må leveres alene, fordi en lokal repræsentativ selection virkede.

## Lukket læsekontrakt

Delingen foretager tre faste offentlige læsninger: det normale manifest, det SHA- og størrelsesbundne zoneindeks og én valgt zonefil. Der er ingen vilkårlig upstream, forespørgsel til private data eller brugerbestemt scorekilde. Manifest-, indeks- og zonefiler har henholdsvis 512, 128 og 32 KiB som egne øvre grænser.

Én monoton 15-sekunders deadline begynder ved manifestlæsningen og deles med alle efterfølgende trin og samme AbortSignal. Der må ikke startes et nyt fuldt tidsbudget for hver fil. Hele bytes, SHA-256, præcis generation, modelbinding, 118-timersakse, 210-zoneinventar, tidspunkt, søgemåde og sprog skal passe. Udløbet, ukendt, afvigende eller manglende input giver den eksisterende neutrale visning uden opfundet score eller valg af en anden time. De øvrige metode-, origin-, privacy-, noindex/no-store- og sikkerhedskontroller bevares.

Der tilføjes ingen DB-, R2-, KV-, D1- eller Supabase-binding, billedlager, nye nøgler, tjenester, planer, leverandørhentninger eller ekstra beregning af vejret. Geometri, administratorpunkter, kildeprioritet, originaler og offentliggjort historik bevares. Statiske offentlige filer er ikke et nyt privat datalager eller bevis for gratis runtimekapacitet.

## Obligatorisk samlet levering og tilbageværende beviser

1. ROOT samler og gennemgår den faktiske 592-kilde med de kompakte produktblade, den hukommelsessikre normalproducent og denne dokumentation. De allerede udstedte bindings-/migrationsbytes må ikke genudstedes for observations- eller delingsbladene. Relevante normale mål og én præcis samlet kildekvalifikation kræves.
2. En virkelig ny offentlig 592-generation skal levere manifest, indeks og alle zonefiler gennem de normale artifact-, privacy-, model-, original- og deploykontroller. Fuld 118 × 210 × 2-paritet skal bevises i det artifact; lokal proxy eller prototype erstatter det ikke.
3. Den eksisterende legacy-Worker skal gennem sin eksisterende kontrollerede leveringsvej opdateres med en faktisk 592-kompatibel kompaktlæser. Den må ikke efterlades på 591 mod det nye 592-manifest. Gamle links skal fortsat kontrolleres på den faktiske nye binding og eksakte selection. Ingen dobbeltmodellæser eller lempet binding tilføjes som genvej.
4. Pages/Functions skal kvalificeres på den godkendte prøvehost med den samme faktiske binding. Kold/varm hosted svartid, CPU, samlet Free-forbrug og råderum skal måles. En lokal proxy under 10 ms er ikke bevis for Cloudflare Free-CPU; de andre tjenester deler fortsat kontoens kapacitet.
5. GET/HEAD, OG, robots, ugyldig og udløbet selection samt Facebooks faktiske preview og egen cache skal afprøves efter levering. Godkendt Pages/DNS/TLS og det senere klientskifte beholder DEC-0294s særskilte gates. Ingen offentlig delingsklar-påstand før disse relevante beviser og legacy-kompatibiliteten foreligger.

Alle driftsidentiteter, konkrete tids-/CPU-målinger og private pakkeoplysninger føres i checkpointet. Håndbog 89.282 er kanonisk i Markdown og spejles til web og den normale INSTALL-håndbogspayload. Ældre 89.279-diagnostik, 89.281-taildokumentation og de øvrige afsnit bevares. De øvrige åbne mål består.
