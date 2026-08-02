# DEC-0021 – Bedste tidspunkt skal følge RavScore

## Status
Bindende og implementeret i 4.0.72.

## Beslutning
“Bedste beregnede tidspunkt” skal altid være den tilgængelige aktuelle eller fremtidige time med den højeste samlede RavScore fra samme scoremotor og samme jagtform.

For dagens prognose skal den aktuelle viste vurdering indgå i sammenligningen. Fortidige prognosetimer må ikke vælges. Ved nøjagtigt samme RavScore må wadersvisningen bruge lavere og faldende vandstand som tie-breaker, men vandstanden må aldrig få en lavere RavScore til at blive kaldt bedre.

Zonevisning og landsprognose skal bruge den samme centrale udvælgelsesfunktion. Brugerfladen skal kunne forklare valget og vise sammenlignelige alternativer.

## Begrundelse
Tidligere prioriterede waderslogikken lave/faldende vandstandstimer frem for den højeste samlede RavScore og sammenlignede ikke med den aktuelle vurdering. Det kunne medføre, at en time med kraftig strøm væk fra land og en lavere RavScore blev vist som dagens bedste.
