#!/usr/bin/env node
import { createProtectedPrivateRuntimeClients } from './protected-private-production-runtime.mjs';
import {
  assertPrivateWeatherPublicationBackend,
  checkCodeOnlyPrivateWeatherRebind,
} from './publish-private-weather-runtime.mjs';

try {
  assertPrivateWeatherPublicationBackend();
  const { documentRequest } = createProtectedPrivateRuntimeClients();
  await checkCodeOnlyPrivateWeatherRebind(
    documentRequest, undefined, process.env.RAVRADAR_PRODUCTION_TARGET_HOUR ?? '',
  );
} catch (error) {
  const code = /^PRIVATE_WEATHER_PUBLICATION_[A-Z_]+$/.test(error?.code ?? '')
    ? error.code : 'PRIVATE_WEATHER_PUBLICATION_REBIND_ADMISSION_UNKNOWN';
  console.error(code);
  process.exitCode = 1;
}
