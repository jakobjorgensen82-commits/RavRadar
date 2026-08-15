# RavRadar 4.0.219

- Fjerner en overflødig readback af den cirka 0,53 MB kompakte vandstandsroutingaudit fra hver 15-minutterskørsel.
- Routingauditten genbygges fortsat fra friske data, uploades beskyttet til Supabase og vises i ejerens adminrapport.
- Det centrale stationsregister og al redigerbar admin-konfiguration hydrerer fortsat før vejrbygningen.
- En ny read-only estimator måler pipeline-readback på faktiske artifacts uden at kalde resultatet Supabase-billing.
- På 4.0.218-artifactet sænkes den beregnede nedre pipelinegrænse fra cirka 4,44 til 3,03 GiB pr. 30 dage ved 96 kørsler dagligt; cirka 1,42 GiB undgås.
