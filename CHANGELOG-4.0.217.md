# RavRadar 4.0.217

- Retter en dokumenteret fejl, hvor den videnskabelige strømproveniens kun blev skrevet tilbage til `samples24h`, selv om næste vejrbygning autoritativt videreførte `samples72h`.
- Den aktuelle prøve synkroniseres nu til både 24- og 72-timershistorikken efter den eksisterende strenge DMI-U/V-verifikation.
- Kun prøven med det aktuelle datasæts eksakte genereringstid må ændres. Ældre uverificerede prøver forbliver uverificerede og rekonstrueres ikke bagudrettet.
- Den aktive 24-timersscore, RavScore, kilder, fallback og missing-regler er uændrede.
- P1-auditten måler nu faktisk tidsrum, største hul og verificeret strømandel i begge historikvinduer i stedet for kun antal rækker.
- Før rettelsen viste produktionsartifact #2750 142 prøver/35,1 timer i alle 210 zoner, men kun 10 zoner havde en længere verificeret serie; 75 havde nul og 125 kun én verificeret prøve. Dette er baseline for fremadrettet eftermåling.
