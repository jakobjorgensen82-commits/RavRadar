# RavRadar 4.0.475 – behold sikker fejldiagnose

Providerfri `35866710973` genbrugte den aktuelle vejrpakke, men
checkpointets SQL-CAS afviste stadig `INPUT_INVALID`. Den nye diagnose
afviste selv databasens svar som `RESPONSE_REASON_SHAPE` og skjulte
dermed den konkrete årsag.

Den skrivefri diagnose spørger nu først efter den faktiske samlede
payloadregel. Ved et ufuldstændigt svar bruges afgrænsede portioner.
Kendte faste fejlkoder og begrænsede antal bevares; uventede felter
vises kun som anonymt afvigelsesantal. Ingen rå vejrdata, kystdel-ID'er
eller private payloads logges. CAS-accept, score, leverandørvalg,
cache, geometri og offentlig data er uændrede.

Den tværgående gennemgang fastholder særskilt, at almindelige kørsler
tidligere er stoppet i cache, backend og deploykontrol. Sidste fulde
normalrun havde 5.201 manglende **havstrøms**par og nul Copernicus i
slutvalget. Dette er endnu ikke stabil eller fuldt dækket drift.
