# RavScore: aktiv national skyggekørsel 4.0.251

Status: Grøn privat milepælskontrol. Ingen offentlig score, geometri eller runtime blev ændret.

## Formål

Kørslen skulle vise, om den aktive bestand på 210 zoner og 673 kystdele kan føres gennem en isoleret DMI-kæde og sammenlignes med kandidat A, B og C uden at påvirke produktionen.

Den første kørsel afslørede, at bølge- eller DKSS-felter fra forskellige DMI-samlinger fejlagtigt kunne kaldes en komplet familie. Version 4.0.251 kræver nu, at alle komponenter i en familie kommer fra samme DMI-samling, og at U/V desuden deler fysisk gitterpunkt.

## Grøn slutkørsel

- 210 zoner og 673 aktive kystdele indgik.
- Ingen kystdel blev blokeret af den indledende punkt- og gitterkontrakt.
- 243 kystdele fik et fuldt, tidsmæssigt sammenhængende scoregrundlag.
- 430 kystdele manglede en komplet fælles bølge-/DKSS-familie på et fælles scoretidspunkt.
- Ingen parent-fallback, interpolation eller sammenblanding mellem kystdele blev registreret.
- Rå vejrdata blev ikke gemt i det kompakte artefakt.
- Produktion, offentlig runtime, geometri, admin-data og score forblev uændret.

De 243 scorede kystdele svarer til 36,1 procent af bestanden. Det er tilstrækkeligt som teknisk milepæl, men ikke som repræsentativ national kalibrering.

## Kandidatresultater

Hver scoret kystdel blev vurderet for både vadning og strandsøgning, i alt 486 sammenligningskontekster.

| Sammenligning | Vadning, middelændring | Strand, middelændring | Vigtigste observation |
| --- | ---: | ---: | --- |
| Aktiv til A | +0,05 | -0,34 | Næsten neutralt gennemsnit, men lokale ændringer fra cirka -24 til +23 |
| Aktiv til B | +2,85 | +2,44 | Moderat generelt løft, især ved levering mod kysten |
| Aktiv til C | -3,93 | -4,94 | Bred sænkning; enkelte kontekster faldt op til 27 point |
| A til B | +2,80 | +2,78 | Leveringsdelen løfter de fleste kontekster |
| B til C | -6,79 | -7,38 | C sænkede 238 af 243 kystdele i hver søgemåde og løftede ingen |

## Retningskontrol af B

Kandidat B minus A fordelte sig sådan i de 486 kontekster:

| Retning | Antal | Middelændring |
| --- | ---: | ---: |
| Levering mod kysten | 176 | +5,43 |
| Passage langs kysten | 164 | +2,22 |
| Transport væk fra kysten | 146 | +0,25 |

Det er et lovende retningssignal: B belønner især levering mod kysten og næsten ikke transport væk. Det beviser dog ikke, at hele leverings- og fastholdelsesmodellen er rigtig.

## Hvad kørslen ikke kunne vurdere

Den nationale kontrakt havde ingen komplette lokale fastholdelsesfeatures. Fastholdelsesdækningen var derfor nul. Kandidat B blev i praksis vurderet på levering, hændelsestid og retning, men ikke på en færdig lokal model for, om ravet bliver liggende og søgbart.

Kørslen var ét aktuelt datatværsnit. Den skal ikke gentages og ventes på som udviklingsmetode. Faste scenarier og historiske genafspilninger skal bruges til faglig udvikling; DMI-skyggen bruges til milepælskontrol af den virkelige datakæde.

## Beslutning

- Aktivér ikke A, B eller C på baggrund af denne kørsel.
- Behold den aktive 25/40/35-vægtning som foreløbig offentlig baseline.
- Før B's retningsidé videre til kontrollerede scenarier og den videnskabelige analyse.
- Behandl C's nuværende svageste-led-reduktion som for bred og for stærk, indtil forskning og afgrænsede scenarier begrunder andet.
- Brug ikke nationalt gennemsnit som bevis; gennemgå scenarier og store lokale ændringer særskilt.
- Forbedr eller erstat fastholdelsesdelen, før B kan vurderes som samlet kandidat.
