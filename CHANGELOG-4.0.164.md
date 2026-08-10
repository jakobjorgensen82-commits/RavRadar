# RavRadar 4.0.164

- Registrerer den livefundne #2157-fejl: den nationale HARMONIE-gate ramte produktionsparserens standardtidsbudget efter 16 minutter; ingen del nåede at blive godkendt på et ufuldstændigt grundlag.
- Giver kun det private 774-dels vindtrin et eksplicit 50-minutters arbejdsbudget uden at svække DMI-, grid-, provenance- eller missing-krav.
- Tilføjer en privat DEC-0033-shadow-scoregate, som bruger den eksisterende `calculateRavScore` for egne native vind-, bølge-, strøm- og vandstandsdata samt isoleret state.
- Kræver eksakt fælles native tid. Nærmeste tidspunkt, interpolation, parentfallback, krydsmerge og manglende komponenter som nul er forbudt.
- Klassificerer privat dækning som `whole-zone`, `only-part`, `several-parts` eller `uncertain` med den midlertidige 7-pointmargin.
- Rå transientværdier slettes efter gaten. Aktiv geometri, admin, sampling, state, RavScore, UI og offentlig runtime forbliver uændrede.
