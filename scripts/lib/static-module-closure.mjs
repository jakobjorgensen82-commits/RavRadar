function tokens(source) {
  const result = [];
  const text = String(source);
  let index = 0;
  const push = (type, value = null) => result.push(Object.freeze({ type, value }));

  const scanCode = stopAtTemplateExpressionEnd => {
    let nestedBraceDepth = 0;
    while (index < text.length) {
      const char = text[index];
      if (stopAtTemplateExpressionEnd && char === '}' && nestedBraceDepth === 0) {
        index += 1;
        return;
      }
      if (/\s/.test(char)) { index += 1; continue; }
      if (char === '/' && text[index + 1] === '/') {
        index = text.indexOf('\n', index + 2);
        if (index < 0) {
          if (stopAtTemplateExpressionEnd) {
            throw new Error('Unterminated template expression in module closure');
          }
          return;
        }
        continue;
      }
      if (char === '/' && text[index + 1] === '*') {
        const end = text.indexOf('*/', index + 2);
        if (end < 0) throw new Error('Unterminated block comment in module closure');
        index = end + 2;
        continue;
      }
      if (char === '/') {
        const previous = result.at(-1);
        const regexAllowed = !previous
          || (previous.type === 'punct' && '([{=,:;!?&|+-*%^~<>'.includes(previous.value))
          || (previous.type === 'id' && [
            'return', 'case', 'throw', 'else', 'do', 'typeof', 'instanceof',
            'in', 'of', 'yield', 'await',
          ].includes(previous.value));
        if (regexAllowed) {
          index += 1;
          let inClass = false;
          let closed = false;
          while (index < text.length) {
            if (text[index] === '\\') { index += 2; continue; }
            if (text[index] === '[') { inClass = true; index += 1; continue; }
            if (text[index] === ']' && inClass) { inClass = false; index += 1; continue; }
            if (text[index] === '/' && !inClass) {
              index += 1;
              while (/[A-Za-z]/.test(text[index] ?? '')) index += 1;
              closed = true;
              break;
            }
            index += 1;
          }
          if (!closed) throw new Error('Unterminated regular expression in module closure');
          push('regex');
          continue;
        }
      }
      if (char === '"' || char === "'") {
        const quote = char;
        let value = '';
        index += 1;
        let closed = false;
        while (index < text.length) {
          const current = text[index];
          if (current === '\\') {
            if (index + 1 >= text.length) break;
            value += text[index + 1];
            index += 2;
            continue;
          }
          if (current === quote) { index += 1; closed = true; break; }
          if (current === '\n' || current === '\r') break;
          value += current;
          index += 1;
        }
        if (!closed) throw new Error('Unterminated string in module closure');
        push('string', value);
        continue;
      }
      if (char === '`') {
        index += 1;
        let closed = false;
        while (index < text.length) {
          if (text[index] === '\\') { index += 2; continue; }
          if (text[index] === '`') { index += 1; closed = true; break; }
          if (text[index] === '$' && text[index + 1] === '{') {
            index += 2;
            // Treat the expression boundary as an opening delimiter so a regex
            // literal is legal at the beginning of ${ ... }. Imports inside the
            // expression remain visible to the closure scanner.
            push('punct', '{');
            scanCode(true);
            continue;
          }
          index += 1;
        }
        if (!closed) throw new Error('Unterminated template in module closure');
        push('template');
        continue;
      }
      if (/[A-Za-z_$]/.test(char)) {
        let end = index + 1;
        while (end < text.length && /[A-Za-z0-9_$]/.test(text[end])) end += 1;
        push('id', text.slice(index, end));
        index = end;
        continue;
      }
      if (/[0-9]/.test(char)) {
        let end = index + 1;
        while (end < text.length && /[A-Za-z0-9_.]/.test(text[end])) end += 1;
        push('literal');
        index = end;
        continue;
      }
      if (stopAtTemplateExpressionEnd && char === '{') nestedBraceDepth += 1;
      if (stopAtTemplateExpressionEnd && char === '}') nestedBraceDepth -= 1;
      push('punct', char);
      index += 1;
    }
    if (stopAtTemplateExpressionEnd) {
      throw new Error('Unterminated template expression in module closure');
    }
  };

  scanCode(false);
  return result;
}

function statementEnd(items, start) {
  for (let index = start; index < items.length; index += 1) {
    if (items[index].value === ';') return index;
    if (index > start && items[index].type === 'id'
      && ['import', 'export'].includes(items[index].value)) return index;
  }
  return items.length;
}

export function exactRelativeModuleSpecifiers(source, label = 'module') {
  let items;
  try { items = tokens(source); }
  catch (error) { throw new Error(`${label}: ${error.message}`); }
  const values = new Set();
  for (let index = 0; index < items.length; index += 1) {
    const token = items[index];
    if (token.type !== 'id' || !['import', 'export'].includes(token.value)) continue;
    const next = items[index + 1];
    if (token.value === 'import' && next?.value === '.') continue;
    if (token.value === 'import' && next?.value === '(') {
      const specifier = items[index + 2];
      const close = items[index + 3];
      if (specifier?.type !== 'string' || close?.value !== ')') {
        throw new Error(`${label} contains a non-literal or unparsed dynamic import`);
      }
      if (specifier.value.startsWith('./') || specifier.value.startsWith('../')) {
        values.add(specifier.value);
      }
      index += 3;
      continue;
    }
    const end = statementEnd(items, index + 1);
    if (token.value === 'import' && next?.type === 'string') {
      if (next.value.startsWith('./') || next.value.startsWith('../')) values.add(next.value);
      index += 1;
      continue;
    }
    let from = -1;
    for (let cursor = index + 1; cursor < end; cursor += 1) {
      if (items[cursor].type === 'id' && items[cursor].value === 'from') { from = cursor; break; }
    }
    if (from >= 0) {
      const specifier = items[from + 1];
      if (specifier?.type !== 'string') {
        throw new Error(`${label} contains an unparsed static module specifier`);
      }
      if (specifier.value.startsWith('./') || specifier.value.startsWith('../')) {
        values.add(specifier.value);
      }
    } else if (token.value === 'import') {
      throw new Error(`${label} contains an unparsed import expression`);
    }
  }
  return [...values];
}
