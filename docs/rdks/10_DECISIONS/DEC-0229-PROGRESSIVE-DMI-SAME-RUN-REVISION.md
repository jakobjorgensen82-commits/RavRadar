# DEC-0229 – Accepteret DMI-revision i samme modelkørsel

**Status:** Bindende fra 4.0.451 med DEC-0264's snævre beskyttede-bevarelse.

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

**Aktuel præcisering 2026-09-30:** DEC-0264 supersederer kun det
absolutte stop for eksakt samme, uafhængigt validerede DMI-sted,
time, komponent, collection, gitter, lag og modelkørsel, når den
beskyttede deployed-værdi allerede er valgt, og progressiv cache
ikke kan bevise en nyere officiel revision. Da bevares den gamle
komponent; ikke-sammenlignelige/ugyldige kilder og generisk replay
forbliver strenge.

Grundlaget er normalrun `35567119842`, som nåede komponent-runtime men stoppede
ved en RavScore-konflikt mellem gammel runtime og progressiv DMI-cache.
Loggen indeholder ikke de to konflikters kildeidentitet; same-run revision er
en lokalt reproduceret mangel, endnu ikke den beviste årsag til produktionsstoppet.
Denne præcisering erstatter DEC-0192's absolutte same-run-afvisning alene ved
bevist officiel revision. Kildenavne alene autoriserer aldrig erstatning.
