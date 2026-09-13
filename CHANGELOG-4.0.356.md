# RavRadar 4.0.356

- Retter startup-fejlen, der afviste cutover `34761090699`, før GitHub oprettede et eneste job.
- Det ydre `build-and-prepare`-kald giver nu den samme read-only `pull-requests`-adgang videre, som det genbrugte buildworkflow kræver til exact-content-kildebeviset.
- Den eksisterende workflowkontrakttest kræver nu eksakt tilladelsesparitet for både build- og deploy-kald, så et indre workflow ikke igen kan få en tilladelse, som caller glemmer.
- PR #292/sourcegate `34759300669`, main `5bcd5fb2` og cache-handoff `34760554781` er grønne. Ingen vejr-, score-, model-, geometri-, database- eller offentlig datakontrakt ændres.
- Det grønne vejrgrundlag genbruges uden oneoff eller providerhentning. Efter exact-head-kontrol og merge genskabes kun det SHA-bundne handoff på den nye main, hvorefter cutover fortsætter.
