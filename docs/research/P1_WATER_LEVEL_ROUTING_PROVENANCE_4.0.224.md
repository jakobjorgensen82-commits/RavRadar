# P1 – faktisk provenance efter vandstandsrouting

## Fund

Supportartifact #2795 viste én DMI-vandstandstime uden model-run pr. zone. Den dybere kontrol viste, at problemet var bredere end den ene time: vandstandsroutingen erstattede korrekt værdien med DMI-serien fra de valgte vandstandspunkter, men lod zonens tidligere `sources.waterLevel` stå. Kildemærket kunne derfor beskrive en anden DKSS-model end den, som faktisk leverede værdien.

Den aktuelle centrale routing bruger i artifactet:

- 23 zoner kun med `dkss_lf`,
- 51 zoner kun med `dkss_nsbs`,
- 49 zoner kun med `dkss_idw`,
- 14 zoner med en vægtet kombination af `dkss_lf` og `dkss_nsbs`,
- 73 zoner med en vægtet kombination af `dkss_idw` og `dkss_nsbs`.

Et enkelt gammelt collectionnavn kan derfor ikke sandt beskrive alle routede vandstande.

## Rettelse

4.0.224 fører DMI-proveniens fra hvert valgte kildepunkts rå DKSS-rækker gennem den eksisterende timeinterpolation og videre til den routede zoneserie. Hver routet time får:

- den eller de faktiske DKSS-collections,
- den eller de faktiske modelkørsler,
- lead time, forecastalder og native gyldighedstider,
- routingmetode og de valgte stabile source keys.

Ved flere modelområder er det entydige `collection` den sorterede sammensætning, mens `collections` bevarer delene maskinlæsbart. Hvis gammel cache mangler den nødvendige identitet, mærkes proveniensen `incomplete` i stedet for at opfinde den.

## Afgrænsning

Rettelsen ændrer metadata efter den allerede aktive routing. Vandstandsværdier, valgte punkter, vægte, continuity, fallback, score, historik, UI og hav-/landpunkter er uændrede. Produktionsartifactet skal bevise nul udokumenterede routede DMI-vandstandstimer og bevare de fulde gates.

## Produktionsresultat

Pushkørsel #31895640397 på commit `82c07b54` bestod central adminhydrering og tombstones, frisk DMI-bygning, fuld `validate`, releasegate, Supabase-synkronisering, Pages-artifact og deploy. Supportartifact #2797 indeholder datasæt `rr-20260815163132-210`.

Alle 23.310 routede vandstandstimer har både collection og model-run; auditten rapporterer nul DMI-vandstandstimer uden collection og nul uden model-run. Fordelingen omfatter de faktiske enkeltkilder `dkss_idw`, `dkss_nsbs` og `dkss_lf` samt de sammensatte `dkss_idw+dkss_nsbs` og `dkss_lf+dkss_nsbs`. Ingen routet time er mærket med ufuldstændig provenance.

Direkte Pages-kontrol viste offentlig version 4.0.224, samme datasæt og 210 zoner. Den score-neutrale strømhistorik voksede samtidig til 40,449 rå timer og 4,730–40,449 verificerede timer; alle zoner er fortsat under 72-timerskravet.
