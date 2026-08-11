# RavRadar 4.0.181

- Retter den alvorlige offentlige kortfejl, hvor hver af de 605 lokale beregningsdele blev vist som en selvstændig zone.
- Kortet viser igen én autoritativ kystlinje, ét navn og én klikflade pr. hovedzone med kun en sort markering ved hver ende.
- Lokale kystdele, land-/vandpunkter, DMI-serier og RavScore bevares uændret bag hovedzonevisningen.
- Reducerer det første kortlag fra 2.488 synlige del-/multipartlinjer og cirka 12.440 Leaflet-objekter til 209 aktive hovedzoner og cirka 1.045 objekter.
- Registrerer en særskilt efteraudit af kendte relevante ravstrande, som ikke dækkes af de lokale beregningsdele.

Produktionsstatus: verificeret i GitHub-kørsel #2279 (`31505747519`) med frisk DMI-kæde, fuld Linux-validering, release-gate, Pages-artifact og deploy. Offentlig browserkontrol viser version 4.0.181, 208 centralt aktive hovedzoner og præcis 416 endemarkeringer; de 605 interne dele tegnes ikke som zoner.
