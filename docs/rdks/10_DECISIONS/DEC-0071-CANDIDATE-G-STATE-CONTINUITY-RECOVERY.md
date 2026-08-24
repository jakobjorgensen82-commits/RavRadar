# DEC-0071 – Candidate G-tilstand skal fortsætte fail-closed

**Status:** MERGET I 4.0.272; PRODUKTIONSBEVIS MANGLER

**Dato:** 2026-08-24

**Berører:** produktionshydrering, Candidate G-profilgate, engangs tilstandsrecovery og releasekontrol

**Ændrer ikke:** scoreformel, 20/50/30, vejrregler, geometri, zoner eller land-/vandpunkter

## Problem

En planlagt produktion fik timeout under den atomiske hentning af det seneste offentlige manifest og den tilhørende conditions-fil. Fejlen blev logget, men hydreringen returnerede succes. Den efterfølgende vejropbygning fandt derfor ingen tidligere Candidate G-tilstand og nulstillede alle 673 kystdele med `NO_PREVIOUS_STATE`. Fordi global pre-public opvarmning fortsat var tilladt, blev den kunstige nulstart offentliggjort som aktive, meget lave scorer.

Den sidste grønne produktion umiddelbart før fejlen dokumenterer derimod 673/673 accepterede fortsættelser og normal scorevariation. Grundbogsrettelserne ændrede ingen scorekode; deres merge udløste blot den produktion, hvor den skjulte driftsfejl viste sig.

## Beslutning

1. Offentligt manifest og conditions hydreres atomisk. Timeout, hentefejl eller datasætmismatch er fatal og stopper før ny beregning og deploy.
2. Aktiv Candidate G må ikke erklæres klar ved en global `NO_PREVIOUS_STATE`-nulstart.
3. En lille lokal `COASTAL_PART_CONTEXT_CHANGED`-nulstilling er fortsat tilladt efter en bevidst ejerændring af punkt eller kystkontekst, men den må højst omfatte cirka én procent af delbestanden og lemper ingen øvrig gate.
4. Den forgiftede fortsættelseslinje må én gang genoptages fra den eksakte sidste grønne Actions-kørsel. Den genkendes kun i det dokumenterede tidsvindue, når mindst 99 % af delene mangler al strømevidens fra før den kendte landsnulstilling. Dermed virker recoveryen også, hvis en senere time har accepteret den nulstillede state under et nyt datasæt-id.
5. Recoverykilden kræver korrekt kørsel, datasæt, 673 del-ID'er, model-, profil- og variantbinding, schema, typer, tid/evidens og samlet integritet. Når historik fra før nulstillingen er genindsat, er betingelsen straks falsk, også før et nyt datasæt er offentliggjort.
6. Recoveryen kopierer kun hver dels kompakte `candidateG.currentState`. Vejr, scores, forklaringer, profilvalg, zonefelter, geometri, land-/vandpunkter og private payloads må ikke kopieres.
7. Mismatch stopper fail-closed. Recovery må ikke bruges som generel rollback eller skjule en ufuldstændig ny produktion.
8. Efter en frisk grøn produktion skal konfigurationen deaktiveres; indtil da er den allerede logisk inaktiv, så snart den raske historik er tilbage.

## Punktpar 2 er et separat forhold

Ejerens senere flytning af punktpar 2 ændrer legitimt stateKey for netop den berørte kystdel. Den efterfølgende build manglede én komplet offentlig delrække. Den må ikke udfyldes med moderzonens eller en nabodels strøm; REQ-CURRENT-COVERAGE-100-001 og 673/673-gaten består. Frisk tilladt evidens og normal cacheopbygning skal først genprøves.

## Kontrol

- Målrettet regression for fatal atomisk hydration og bevarelse af lokal fil ved mismatch.
- Målrettet profiltest for global nulstart, lille lokal kontekstreset og udbredt kontekstreset.
- Målrettet recoverytest for state-only kopi samt afvisning ved integritetsændring.
- Exact-head kildegate, frisk central fuld produktion, releasegate og 210/673-browserkontrol.
- Eksakt diffkontrol af `data/kystdata.json` og `data/zones.geojson`: kun versionsfelt 4.0.271 → 4.0.272; intet geografisk indhold.

PR #131 bestod exact-head-kildegaten og blev merged som `1bbb4cc2`. Produktion `32759180937` gennemførte både genkendelse, hentning og state-only recovery grønt, men stoppede senere i den fulde validering: en ældre kontrakttest krævede fortsat hydratorens nul-argument-funktion `active_zone_ids()`. Opfølgningen bevarer denne indgang og lægger den nye testbare rodvariant bagved; ingen runtimeadfærd eller data ændres af kompatibilitetsrettelsen.
