function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function assertPublicDeliveryNestedBinding(document, expected) {
  const expectedText = canonical(expected);
  const pending = [[document, 'delivery']];
  while (pending.length) {
    const [value, location] = pending.pop();
    if (!value || typeof value !== 'object') continue;
    for (const [key, child] of Object.entries(value)) {
      const childLocation = `${location}.${key}`;
      if ((key === 'modelBinding' || key === 'ravScoreModelBinding')
        && canonical(child) !== expectedText) {
        throw new Error(`${childLocation} belongs to a different model bundle`);
      }
      if (key === 'modelBundleSha256' && child !== expected?.modelBundleSha256) {
        throw new Error(`${childLocation} belongs to a different model bundle`);
      }
      if (child && typeof child === 'object') pending.push([child, childLocation]);
    }
  }
}
