# DEC-0294 – Prognosedeling på separat Pages og én Simply-CNAME

**Dato:** 2026-10-29
**Status:** Ejerens valg er godkendt; privat funktionel kandidat, samlet kvalifikation og offentlig levering er åbne.

## Beslutning og autoritet

Opret kun ét særskilt Cloudflare Pages/Functions-projekt: `ravradar-del` på den eksisterende konto. Først kvalificeres `ravradar-del.pages.dev`. Senere tilknyttes kun `del.ravradar.dk` med én ny CNAME hos Simply. Ingen NS-flytning, ændring af apex/www eller mailposter. Den tidligere undersøgte navneserverflytning og venten på ejerens DNS-valg er dateret historik på dette punkt.

ROOT ejer projektoprettelse, deploy og DNS. Den eksisterende kvalificerede-main-kontrol, eksklusive writerkanal og friske kontrol før writes skal bruges. Kun entydig 404 tillader den ene oprettelse; et ukendt eller eksisterende projekt må ikke overtages. Ukendt skriveudfald afklares ved genlæsning før et nyt forsøg. Brug eksisterende credentialnavne; utilstrækkelig Pages Write standser uden ny eller udvidet nøgle. Ingen betalt plan er godkendt.

## Mindste funktionelle ændring

Pages-adapteren videresender kun request til den eksisterende uændrede `handleForecastShare` med præcis de to kildevalgte værter `ravradar-del.pages.dev` og `del.ravradar.dk`. Kun rodstien er dynamisk; statiske assets er begrænset til de gennemgåede delingsfiler. Frontendens eksisterende Worker-adresse og den gamle Worker-kontrol bevares i første fase. En senere hostændring skal holde Worker-adressen særskilt og lukke frontendens normale modul/cachebusterkæde.

Handleren læser kun fast offentligt manifest, hash-/størrelseskontrolleret zonepakke og zoneregister. GET/HEAD, metode-/origin-/stipræcision, zone/time/søgemåde/sprog, gyldighed og manglende-score-regler er uændrede. Ingen vilkårlig upstream/score fra query, logincredentials, ny beregning, database, KV/R2/D1/Supabase-binding, billedlager eller vejrleverandørhentning. Eksisterende logo genbruges.

Delingslæseren genbruger de tre faste sprogs datoformattering og sparer gentagne sammenligninger med en privat, uforanderlig lokal modelbinding. Hver indlejret models fulde tuple-, nøgle- og prototypekontrol bevares. Den hurtigere gennemgang vælges kun for delingslæserens egen identitet efter fuld manifestkontrol; andre kaldere beholder hele den oprindelige generiske gennemgang, inklusive rækkefølgen ved getters og Proxy. Der caches hverken scorer eller valideringsresultater fra kaldere. Lokale timingforbedringer er ikke bevis for Free-planens CPU-grænse.

Den præcise robots-tilføjelse tillader previewrobotter at hente linket. Handlerens noindex/no-store og øvrige CSP-/privacygrænser bevares. Et link fastfryser ikke fremtidige scorer; uverificerbart eller udløbet input får ingen konstrueret score. Den lange selection-query forkortes ikke af domæneskiftet.

### Præcis tohostkandidat 31. oktober

Den lokale adapter vælger kun mellem de to faste HTTPS-origins og bevarer handlerens rodsti-, metode-, private input-, generations-, model- og timekontrol. OG/canonical bruger den faktisk validerede egen host; app-link og offentlige prognoselæsninger bliver på ravradar.dk. Header, miljø og query kan ikke indsætte en tredje host. Dette er kildeforberedelse, ikke projekt-/domæneoprettelse eller frontendaktivering. Den normale lokale delings-/tidsskyderprøve bevarer de oprindelige 153 cases og består nu med 171; hosted Pages/Free, Facebook, DNS/TLS og klientovergang er fortsat åbne.

### Kontrolleret kodeopdatering efter første create, 31. oktober

Den lokale kandidat tilføjer en særskilt update-handling til det eksisterende Pages-workflow. Standard create kræver stadig entydigt fravær og afviser et eksisterende projekt. Update kræver egen bekræftelse samt projekt-ID fra ROOTs faktisk vellykkede første create-kvittering og et tidligere verificeret deployment-ID/commit. Projekt, forgænger, canonical/latest, main og lokale input genlæses; præcis allerede leveret kode giver kun en fuldt genlæst no-op. Update opretter eller patcher aldrig et projekt, og ukendt write-/procesudfald bevarer UNKNOWN_NO_RETRY.

ROOT skal hente projektidentiteten fra den gemte vellykkede første create-kvittering. Callerfelter, opdaget tilstedeværelse eller et projekt efter mistet create-svar er ikke i sig selv ejerskabsbevis. Update kræver præcis pages.dev-domænemængde og nul ressourcebindinger/secrets før og efter; et ændret projekt eller en ændret forgænger afvises før write. Det normale faste engangs-Wrangler-/proceskald og den eksklusive writerkø bevares.

Pages-controller og workflow registreres som delingsproduktkode med deres normale controllerprøve; produktkode er ikke test-only eller databaseudførelse. De gamle konservative import-/læse-/bindingflader og hele PG143/C100/I99/T12 bevares. Den faktiske direkte PR-plan og kumulative plan fra den kvalificerede FULL-forfader skal begge kontrolleres; kontrolændringen kræver den eksisterende CONTROL-suite og eksakt uafhængigt ROOT-review. Ukendt eller fælles påvirkning udvider prøverne. Nye præcise kildeplaner, kvalifikation og sikker levering er stadig åbne; detaljeret evidens føres privat.

Dette er lokal kildeforberedelse i pages.dev-fasen, ikke hosting eller offentlig levering. Customdomæne afvises fortsat; senere domænebinding, én Simply-CNAME, TLS og klient-/cachebusterlukning er åbne sammen med aktuel offentlig 594-kompatibilitet, legacy-Worker, hosted GET/HEAD/OG/robots, Facebook og målt delt Free-/CPU-kapacitet. Ingen ny version, C/I/T, migration, SQL-eksekvering, vejr-/scoreændring, geometri eller aktivering. Ældre create-only-beskrivelser er erstattet alene for denne kontrollerede kodeopdatering; alle eksisterende identitets- og sikkerhedsafslag består.

## Leveringsrækkefølge og åbne beviser

1. Adapter/robots, controller og den afgrænsede læseroptimering er lokalt sammenført med denne dokumentation. Præcis samlet kildekontrol kræves; lokal sammensætning er ikke offentlig kvalifikation.
2. I et skrivefrit vindue: faktisk projektfravær/rettighed → kontrolleret oprettelse ved 404 → normal Pages-bygning/deploy fra fast projektmappe → genlæsning af projekt, deployment, branch, commit, alias og fravær af ressourcebindinger/secrets. Ukendt udfald er ikke en gentagelsestilladelse.
3. Verificér faktisk senere offentlig 594-generation og hostens strenge model-/scorekompatibilitet. Den gamle Workers engangsprøve på 590 er alene et 590-sample; den kræver særskilt kompatibilitetsdeploy for at bevare gamle links. Ingen dobbeltmodellæser eller svækket scorekontrol.
4. Hosted GET/HEAD, OG-billede/tags, robots, ugyldig/udløbet selection, kold/varm svartid og Facebooks egen preview/cache skal prøves særskilt.
5. Mål kontoens samlede Workers Free-forbrug og CPU. Pages Functions deler 100.000 forespørgsler/døgn med blandt andet turlageret; den giver ingen ny separat gratis pulje. Faktisk abonnement, forbrug og konservativt råderum skal dokumenteres før kapacitetsløfte.
6. Først efter fungerende pages.dev: præcis custom-domain-binding, én Simply-CNAME og faktisk aktiv TLS. Derefter normal kildekvalificeret frontendcutover til `del.ravradar.dk`. Bevar gammel tjeneste og kontrolleret mulighed for at føre klientadressen tilbage; ingen automatisk DNS-rollback ved ukendt udfald.

## Kilde- og datagrænser

**Historisk første adaptergennemgang:** ROOTs gennemgang målte de daværende modelinput til C98/I97/T12, union 104, og finder ingen intersection med Pages-kandidatens filer. Der ændres ingen version, modelbinding, scoreformel, kildeprioritet, vejrflow, original, historisk score eller migration. Håndbogens statiske installationspayload spejles gennem den normale synk; DDL og alle 69 migrationsfiler bevares. Der køres ingen SQL.

Den eksisterende normale lokale delings-/tidsskyderprøve er bestået med 153 cases og uden netkald. Det er ikke hosted Pages, Facebook, Free-kapacitet eller offentlig 591. SOURCE-revision, statistik og automatisk sletning aktiveres ikke. Alle fem mål til 18. november 2026 forbliver åbne.

En senere almindelig 591-generation har faktisk leveret de tre normale serverfunktioner og offentlige vejrdata. Den gamle delingstjeneste er særskilt genleveret og viser igen en kontrolleret score fra denne binding. Det er ikke et Pages-/Facebook-/Free-bevis eller bevis for ekstern AI. Aktuelle identiteter og målinger føres privat.

## Henvisninger

- Håndbog 89.278, stabilt ID `forecast-share-pages-simply-cname-2026-10-29`.
- Ejerens Pagesplan, præcis adapter/robots-gennemgang og kontrollernes detaljer findes i det private checkpoint; skiftende deploy-/DNS-identiteter holdes dér.
- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) og [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/) beskriver platformens eksisterende vej. De er ikke bevis for vores konto, rettigheder eller faktisk levering.
