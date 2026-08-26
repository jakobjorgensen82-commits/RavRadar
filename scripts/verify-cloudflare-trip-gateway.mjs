import { normalizeCloudflareGatewayUrl, tripGatewaySignature } from '../supabase/functions/_shared/trip-storage.js';

const gatewayUrl = normalizeCloudflareGatewayUrl(process.env.CLOUDFLARE_TRIP_GATEWAY_URL || '');
const sharedSecret = process.env.TRIP_GATEWAY_SHARED_SECRET || '';
if (sharedSecret.length < 32) throw new Error('Worker-verifikationens delte hemmelighed mangler.');

const health = await fetch(`${gatewayUrl}/health`, { headers: { accept: 'application/json' } });
const healthBody = await health.json().catch(() => ({}));
if (!health.ok || healthBody?.ok !== true || healthBody?.shards !== 10 || healthBody?.storage_schema_version !== 1) {
  throw new Error('Workerens offentlige, datasikre health-kontrakt fejlede.');
}

const unsigned = await fetch(`${gatewayUrl}/v1/trips/count`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
if (unsigned.status !== 401) throw new Error(`Workerens private API accepterede et usigneret kald (${unsigned.status}).`);

const bodyText = '{}';
const timestamp = String(Date.now());
const signature = await tripGatewaySignature({
  secret: sharedSecret,
  timestamp,
  method: 'POST',
  pathname: '/v1/trips/count',
  bodyText,
});
const count = await fetch(`${gatewayUrl}/v1/trips/count`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-RavRadar-Signature': signature,
    'X-RavRadar-Timestamp': timestamp,
  },
  body: bodyText,
});
const countBody = await count.json().catch(() => ({}));
if (!count.ok || countBody?.ok !== true || !Number.isSafeInteger(countBody?.trip_count)) {
  throw new Error('Workerens signerede kontrolkald fejlede.');
}
console.log(`Cloudflare-gatewayen er grøn: privat HMAC-grænse, 10 shards og ${countBody.trip_count} samlede poster.`);
