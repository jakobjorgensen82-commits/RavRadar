# DEC-0019 – Håndbogsreview og Rømø-zoneintegritet

Status: Implementeret i 4.0.64

## Beslutning
1. Ekspertreview skal kunne indsendes direkte i den adgangsbeskyttede admin-håndbog ved hvert afsnit.
2. En succesmeddelelse må først vises efter verificeret læsning fra Supabase.
3. Reviewdata skal være strukturerede og sporbare, så de kan bruges ved faglig analyse, håndbogsrevision, regeloprettelse og ændring af RavScore.
4. Zonen `DK-B04-09` er fejlagtig og må ikke genopstå i aktive data eller ved geometri-regenerering.
5. `DK-B04-08` er den autoritative zone for hele Rømøs vestside.
6. Release Gate skal kontrollere zonefjernelsen, Rømø-geometrien og reviewformularens centrale gemmevej.
