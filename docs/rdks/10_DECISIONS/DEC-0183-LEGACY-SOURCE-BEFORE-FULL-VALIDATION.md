# DEC-0183 – Historisk Candidate G-kilde sikres før fuldvalidering

**Status:** Aktiv og bindende; implementeret og måltestet lokalt i 4.0.401,
livebevis afventer
**Dato:** 2026-09-17

## Baggrund

4.0.400 blev leveret og liveverificeret som kode. Normalrun `35181918091`
gennemførte alle tre providerled, gemte deres cacher, byggede closure,
syvdøgnshistorik og offentlig runtime og bestod den uafhængige runtimeaudit.

Den efterfølgende fuldvalidering stoppede i den historiske Candidate G-
rollbackkontrol. Kontrollen kræver den pinnede 4.0.316-kildecommit
`49dd4cb454656bdf629e5df760176705e38d2cb0`. Sourcegaten var allerede grøn
for præcis samme main-indhold og blev korrekt genbrugt, så dens betingede
historikfetch ikke kørte. Runnerens shallow checkout havde derfor ikke den
gamle commit.

## Beslutning

Det normale produktionsworkflow skal umiddelbart før fuldvalideringen læse
commit- og træidentiteten fra den centrale Candidate G-kontrakt. Findes den
eksakte commit allerede lokalt, genbruges den. Ellers hentes kun denne ene
pinnede commit med dybde én. Både commit og kendt træ bekræftes før
`npm run validate`.

En fuld Git-history checkout ved hver normal vejrkørsel vælges fra, fordi
slutkontrollen kun kræver én fast historisk kilde. Workflowets rækkefølgetest
binder betingelse, hentning, identitet, træbevis og placering før
fuldvalideringen.

## Data- og driftsbetydning

Rettelsen ændrer ikke RavScore, vejrdata, providercacher, kildeprioritet,
geometri eller offentlig score. DMI-, Copernicus- og Open-Meteo-fremgangen
fra `35181918091` er bevaret i GitHub-cacher. Der findes ikke et deploybart
runtime-artefakt fra det stoppede trin, så næste leverance bruger én almindelig
weather på de gemte cacher efter providerfri kodelevering. Ingen oneoff.
