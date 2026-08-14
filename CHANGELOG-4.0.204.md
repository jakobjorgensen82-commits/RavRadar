# RavRadar 4.0.204

- Retter kun det første private nationale land-/vandbevis. 4.0.203's bevis var ved en fejl lavet fra en fil, hvor 107 historiske korrektioner allerede var anvendt, og den nye sikkerhedsgate afviste det derfor korrekt i #31812035188.
- Det nye bevis er beregnet direkte fra den rå 835-dels GitHub-kandidat og matcher dens SHA-256-fingeraftryk præcist: 520 verificerede, 149 sikkert vendte og 166 blokerede.
- Slutkandidatens rå 652-dels bevis og fallbackkandidatens rå 17-dels bevis er verificeret uændrede og genbruges.
- Fingeraftryksgaten forbliver streng. Tvetydige dele har ingen aktive land-/vandpunkter, vejr, state, score eller automatisk aktivering.
- Offentlig geometri, offentlige land-/vandpunkter og RavScore ændres ikke. En fuld ny privat national kørsel og en særskilt ejerafgørelse kræves fortsat før enhver aktivering.
