# DEC-0229 – Accepteret DMI-revision i samme modelkørsel

**Status:** Bindende fra 4.0.451, lokal måltest grøn, produktionsbevis afventer.

Den progressive DMI-cache er en ny accepteret vedligeholdelsesprøve. Hvis den
og den gamle deployede runtime bruger samme DMI-modelkørsel, må den progressive
værdi kun vinde for den samme komponent, når begge rækker er gyldige og den
progressive række har en bevist nyere officiel revision efter den eksisterende
DMI-vælger. Alle ændrede native endepunkter skal have sammenlignelige nyere
tidsstempler af samme type. Nyere deployed revision vinder tilsvarende i modsat
retning. Provider, sted, collection, gitter, komponent og lag skal matche.
Strøm og bølger vælges uafhængigt.

Alle andre ens modelkørsler og alle ikke-sammenlignelige kilder forbliver
konflikter og stopper fail-closed. Scoreformel, DMI-first, fallback-prioritet,
geometri og MISSING-regler ændres ikke.

Grundlaget er normalrun `35567119842`, som nåede komponent-runtime men stoppede
ved en RavScore-konflikt mellem gammel runtime og progressiv DMI-cache.
Loggen indeholder ikke de to konflikters kildeidentitet; same-run revision er
en lokalt reproduceret mangel, endnu ikke den beviste årsag til produktionsstoppet.
Denne præcisering erstatter DEC-0192's absolutte same-run-afvisning alene ved
bevist officiel revision. Kildenavne alene autoriserer aldrig erstatning.
