import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildPrivatePublicHourDeliveryPack,
  materializePrivatePublicHourDeliveryPack,
  privatePublicHourDeliveryMarker,
} from './public-hour-delivery-pack.mjs';
import { assertPublicDeliveryNestedBinding } from './public-delivery-nested-binding.mjs';

const SHA256 = /^[a-f0-9]{64}$/;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

// This transition lives outside the RavScore implementation bundle. It changes
// only exact, recognized model metadata in authenticated, saved hour rows.
export async function rebindPublicHourPackExact({
  sourcePackPath,
  sourceConditions,
  targetConditions,
  targetDetailsSha256,
  outputPath,
  rebindDocumentMetadata,
} = {}) {
  if (typeof sourcePackPath !== 'string' || typeof outputPath !== 'string'
    || !SHA256.test(String(targetDetailsSha256 ?? ''))
    || typeof rebindDocumentMetadata !== 'function') {
    throw new Error('PUBLIC_HOUR_EXACT_REBIND_ARGUMENTS_INVALID');
  }
  const sourceMarker = privatePublicHourDeliveryMarker(sourceConditions);
  const targetMarker = privatePublicHourDeliveryMarker(targetConditions);
  if (!sourceMarker || !targetMarker) throw new Error('PUBLIC_HOUR_EXACT_REBIND_MARKER_MISSING');
  if (sourceMarker.datasetId !== targetMarker.datasetId
    || sourceMarker.productionReferenceAt !== targetMarker.productionReferenceAt
    || sourceMarker.forecastHours !== targetMarker.forecastHours) {
    throw new Error('PUBLIC_HOUR_EXACT_REBIND_GENERATION_CHANGED');
  }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-hour-exact-rebind-'));
  try {
    const restored = await materializePrivatePublicHourDeliveryPack({
      packPath: sourcePackPath,
      conditions: sourceConditions,
      liveDirectory: temporary,
    });
    const hours = {};
    for (const [time, entry] of Object.entries(restored.hours)) {
      const document = JSON.parse(await fs.readFile(
        path.join(temporary, 'forecast', path.basename(entry.path)), 'utf8',
      ));
      rebindDocumentMetadata(document, time);
      document.delivery = {
        ...document.delivery,
        sourceDetailsSha256: targetDetailsSha256,
        modelBinding: structuredClone(targetMarker.modelBinding),
      };
      if (document.nationalForecast && typeof document.nationalForecast === 'object'
        && !Array.isArray(document.nationalForecast)) {
        document.nationalForecast.modelBinding = structuredClone(targetMarker.modelBinding);
      }
      assertPublicDeliveryNestedBinding(document, targetMarker.modelBinding);
      const raw = Buffer.from(`${JSON.stringify(document)}\n`, 'utf8');
      const sha256 = digest(raw);
      const file = `${sha256}.json`;
      await fs.writeFile(path.join(temporary, 'forecast', file), raw, { flag: 'wx' });
      hours[time] = { path: `./forecast/${file}`, sha256, bytes: raw.length };
    }
    const { marker } = await buildPrivatePublicHourDeliveryPack({
      liveDirectory: temporary,
      publicManifest: {
        datasetId: targetMarker.datasetId,
        productionReferenceAt: targetMarker.productionReferenceAt,
        publicConditionDetailsSha256: targetDetailsSha256,
        ravScoreModelBinding: targetMarker.modelBinding,
        detailDelivery: {
          schemaVersion: 1,
          sourceDetailsSha256: targetDetailsSha256,
          hours,
        },
      },
      startupNationalForecast: targetMarker.startupNationalForecast,
      outputPath,
    });
    return marker;
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
