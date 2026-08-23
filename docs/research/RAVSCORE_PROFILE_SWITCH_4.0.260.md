# RavScore-profilomskifter 4.0.260

## Kort konklusion

RavRadar har nu en særskilt, versionsbundet og testbar vej fra den aktive `25/40/35`-profil til Candidate G og tilbage igen. Version 4.0.260 bruger fortsat legacyprofilen. Omskifteren er forberedelse og ændrer ikke det, brugerne ser.

Den seneste naturlige runtime `rr-20260823075018-210` dokumenterer seks timers videreført Candidate G-state: 210/210 zoner, 673/673 kystdele, 1.346 jagtformsevalueringer, 673 accepterede tidligere tilstande, nul nulstillinger og nul rekonstruktionsfejl. Perioden er det praktiske evidensgrundlag, ejeren har valgt til den næste gennemgang; den betegnes ikke som et 48-timersbevis.

## Omskifterens kontrakt

| Felt | 4.0.260 |
| --- | --- |
| Omskifter | `RAVSCORE-PROFILE-SWITCH-4.0.260` |
| Ønsket og aktiv profil | `RRS-CURRENT-B0-4.0.247` |
| Kandidatprofil | `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` |
| Rollbackprofil | `RRS-CURRENT-B0-4.0.247` |
| Automatisk aktivering | Aldrig tilladt |
| Offentlig scoreændring | Ingen |

Candidate G kan kun vælges i en senere version, hvis aktiveringen er eksplicit slået til, hele runtimekontrakten er dækket, en frisk grøn slutshadow er navngivet, og en særskilt ejerbeslutning er navngivet. Ét manglende krav vælger legacy globalt. Det forhindrer en blanding, hvor nogle zoner eller timer bruger Candidate G og andre den gamle model.

## Offentlig projektion og rollback

Adapteren fører Candidate G's tre komponenter ind i RavRadars eksisterende offentlige struktur som `jagtbarhed`, `transport` og `mobilisering`. Strandjagt får ikke wadersloft. Waders følger den allerede besluttede jagtbarhed. Dokumenteret udtømt kraftig fralandsstrøm giver samlet score 0 med den bindende forklaring, mens de øvrige komponenter stadig kan vises.

Standard- og rollbackvejen returnerer det oprindelige legacyresultat direkte. Dermed rekonstrueres 25/40/35 ikke gennem ny kode, og tilbagekoblingen ændrer ikke afrunding, tekster eller komponenter.

Den valgte profil publiceres sammen med kystdelsdata i startpakke, detaljepakke og manifest. Det gør det muligt for slutshadow og browserkontrol at bevise, at hele datasættet bruger samme model.

## Hvad der ikke indgår

- ingen offentlig Candidate G-aktivering;
- ingen ændring af 25/40/35, farver, zonevindere eller bedste tidspunkt;
- ingen sikkerhedsadvarsler eller automatisk stedegnethed;
- ingen bund-, dybde-, rende-, revle- eller adgangsmodel;
- ingen rå strømvektorer, koordinater eller private payloads;
- ingen ændring af artifact, protected-dirty-data, privat cache, geometri eller land-/vandpunkter.

## Næste aktiveringsgate

Efter levering af den score-neutrale 4.0.260-pakke skal en eventuel aktiveringsversion stadig gennemføre central admin-roundtrip, frisk fuld produktion, en dataminimeret slutshadow på den eksakte kode, fuld 210/673-browserkontrol og særskilt ejer-gennemgang. Først derefter kan den ønskede profil ændres fra legacy til Candidate G.
