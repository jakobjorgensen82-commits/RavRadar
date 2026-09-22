import assert from 'node:assert/strict';
import {
  assertRuntimeBindingRegistry,
  RUNTIME_BINDING_REGISTRY,
} from './runtime-binding-registry.mjs';

assert.doesNotThrow(() => assertRuntimeBindingRegistry());
assert.equal(new Set(RUNTIME_BINDING_REGISTRY.map(entry => entry.key)).size,
  RUNTIME_BINDING_REGISTRY.length);

const laterBinding = {
  key: 'weather.current.interpolationPolicy',
  class: 'LIVE_RUNTIME',
  scope: 'component-selection',
  producer: 'scripts/lib/weather-component-selection.mjs#selectCurrent',
  consumers: ['scripts/update-weather.mjs', 'js/services/data-service.js'],
  sourceOfTruth: 'component selection policy',
  validator: 'assertCurrentInterpolationPolicy',
  requiredWhen: 'current-component-present',
  sensitivity: 'public-policy',
  historicalPolicy: 'same-generation-only',
};
assert.doesNotThrow(() => assertRuntimeBindingRegistry([
  ...RUNTIME_BINDING_REGISTRY,
  laterBinding,
]));
assert.throws(() => assertRuntimeBindingRegistry([
  ...RUNTIME_BINDING_REGISTRY,
  { ...laterBinding, key: 'runtime.targetReferenceAt' },
]), /invalid or duplicated/);
assert.throws(() => assertRuntimeBindingRegistry([
  ...RUNTIME_BINDING_REGISTRY,
  { ...laterBinding, consumers: [] },
]), /invalid ownership metadata/);

console.log('Runtime binding registry is additive, unique and metadata-complete.');
