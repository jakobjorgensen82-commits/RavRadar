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
