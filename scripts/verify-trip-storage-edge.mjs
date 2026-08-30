import { PUBLIC_CONFIG } from '../config.js';
import {
  verifyIntegratedAssistantEdge,
  verifyTripStorageEdgeBoundaries,
} from './integrated-cutover-readiness.mjs';

const baseUrl = (process.env.SUPABASE_URL || PUBLIC_CONFIG.supabaseUrl || '').replace(/\/$/, '');
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || PUBLIC_CONFIG.supabasePublishableKey || '';
const requireIntegratedBinding = process.env.RAVRADAR_REQUIRE_INTEGRATED_BINDING === 'true';
if (!baseUrl || !publishableKey) throw new Error('Edge-verifikationens offentlige konfiguration mangler.');

await verifyTripStorageEdgeBoundaries({ url: baseUrl, publishableKey });

const assistant = await verifyIntegratedAssistantEdge({
  url: baseUrl,
  publishableKey,
  requireBinding: requireIntegratedBinding,
});

console.log(`Edge-verifikation: CORS, loginbeskyttet turlog, observationsvalidering og assistant-${assistant.bindingPresent ? 'binding' : 'legacygrænse'} er grønne uden at oprette data.`);
