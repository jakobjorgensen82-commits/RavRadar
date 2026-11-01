// Control-only all-specifier view of the normal lexer; the existing relative scanner is unchanged.
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
        push('punct', '}');
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

// No source is evaluated. Literal bare/URL/data imports remain visible to the
// caller, rather than disappearing from a relative-only dependency list.
export function scanAllSourceDependencies(source) {
  const items=tokens(source),imports=[],importLocations=[],literals=new Set(),initializers=new Map(),functions=[],sensitiveBindings=new Set();
  const serial=values=>JSON.stringify(values.map(({type,value})=>[type,value]));
  const closing=start=>{
    const stack=[],pairs={'(':')','[':']','{':'}'};
    for(let i=start;i<items.length;i++){
      const token=items[i];if(token.type!=='punct')continue;
      if(pairs[token.value])stack.push(pairs[token.value]);
      else if([')',']','}'].includes(token.value)){
        if(stack.pop()!==token.value)throw Error('CONTROL_SOURCE_UNBALANCED');
        if(!stack.length)return i;
      }
    }
    throw Error('CONTROL_SOURCE_UNBALANCED');
  };
  for(let i=0;i<items.length;i++){
    const token=items[i];if(token.type==='string')literals.add(token.value);
    if(token.type==='id'&&['const','let','var'].includes(token.value)
      &&items[i+1]?.type==='id'&&items[i+2]?.value==='='){
      let end=i+3;
      for(;end<items.length;end++){
        if(items[end].type==='punct'&&['(','[','{'].includes(items[end].value)){end=closing(end);continue;}
        if(items[end].type==='punct'&&[',',';'].includes(items[end].value))break;
      }
      const value=items.slice(i+3,end),name=items[i+1].value;
      // Function bodies are classified through their dependency calls, not
      // pinned merely because internal return/validation logic changes.
      if(value.some((t,j)=>t.value==='function'||(t.value==='='&&value[j+1]?.value==='>')))functions.push({name,body:value});
      else{const values=initializers.get(name)??[];values.push(value);initializers.set(name,values);}
    }
    if(token.type==='id'&&token.value==='function'&&items[i+1]?.type==='id'){
      const start=i+2;if(items[start]?.value==='('){const end=closing(start),body=end+1;
        if(items[body]?.value==='{')functions.push({name:items[i+1].value,body:items.slice(body+1,closing(body))});}
    }
    if(token.type!=='id'||!['import','export','require'].includes(token.value))continue;
    const next=items[i+1];if(token.value==='import'&&next?.value==='.')continue;
    if(['import','require'].includes(token.value)&&next?.value==='('){
      const end=closing(i+1),value=items[i+2];
      imports.push({kind:token.value==='require'?'require':'dynamic',
        specifier:value?.type==='string'&&end===i+3?value.value:null,
        expression:serial(items.slice(i+1,end+1))});
      if(value?.type==='string'&&end===i+3)importLocations.push({start:i,specifier:i+2,dynamic:true});continue;
    }
    if(token.value==='require')continue;
    if(token.value==='export'&&next?.type==='id'&&['const','let','var','function','class','default','async'].includes(next.value))continue;
    if(token.value==='import'&&next?.type==='string'){
      imports.push({kind:'static',specifier:next.value,expression:null});importLocations.push({start:i,specifier:i+1,dynamic:false});continue;
    }
    const end=statementEnd(items,i+1);let found=false;
    for(let j=i+1;j<end;j++)if(items[j].type==='id'&&items[j].value==='from'){
      if(items[j+1]?.type!=='string')throw Error('CONTROL_IMPORT_UNPARSED');
      imports.push({kind:'static',specifier:items[j+1].value,expression:null});importLocations.push({start:i,specifier:j+1,dynamic:false});found=true;break;
    }
    if(!found&&token.value==='import')throw Error('CONTROL_IMPORT_UNPARSED');
  }
  const direct=new Set(['readFile','readFileSync','readdir','readdirSync','createReadStream','open','openSync',
    'execFile','execFileSync','execFileAsync','spawn','spawnSync','exec','execSync']);
  const sensitiveNode=/^node:(?:fs(?:\/promises)?|child_process|module|vm)$/;
  const bindingSurfaces=[];
  for(const location of importLocations)if(sensitiveNode.test(items[location.specifier].value)){
    const i=location.specifier;let start=location.start;
    if(location.dynamic)while(start>0&&items[start-1].value!==';'){
      start--;if(['const','let','var'].includes(items[start].value))break;
    }
    const declaration=items.slice(start,i+1);
    bindingSurfaces.push({kind:'node-binding',expression:serial(declaration),initializers:[]});
    for(const token of declaration)if(token.type==='id'&&!['import','from','as','const','let','var','await'].includes(token.value))
      sensitiveBindings.add(token.value);
  }
  const calls=values=>values.flatMap((token,i)=>token.type==='id'&&values[i+1]?.value==='('? [token.value]:[]);
  // Track concrete local reader/command wrappers, including Git wrappers.
  const wrappers=new Set(direct);let changed=true;
  while(changed){changed=false;for(const fn of functions)if(!wrappers.has(fn.name)&&calls(fn.body).some(name=>wrappers.has(name))){
    wrappers.add(fn.name);changed=true;
  }}
  const dependencies=values=>{
    const selected=new Map(),pending=values.filter(t=>t.type==='id').map(t=>t.value);
    while(pending.length){const name=pending.pop();if(selected.has(name)||!initializers.has(name))continue;
      const definitions=initializers.get(name);selected.set(name,definitions.map(serial).sort());
      for(const value of definitions)pending.push(...value.filter(t=>t.type==='id').map(t=>t.value));
    }
    return [...selected].sort(([a],[b])=>a.localeCompare(b,'en'));
  };
  const surfaces=[];
  for(let i=0;i<items.length;i++)if(items[i].type==='id'&&wrappers.has(items[i].value)&&items[i+1]?.value==='('){
    const end=closing(i+1),args=items.slice(i+2,end);
    surfaces.push({callee:items[i].value,expression:serial(items.slice(i,end+1)),initializers:dependencies(args)});
  }
  const reflective=new Set(['eval','Function','createRequire','Reflect','require','constructor','__proto__','globalThis']);
  for(let i=0;i<items.length;i++){
    const token=items[i],sensitive=token.type==='id'&&(sensitiveBindings.has(token.value)||reflective.has(token.value));
    const reflectiveProperty=token.type==='string'&&['eval','Function','require','constructor','__proto__'].includes(token.value)
      &&items[i-1]?.value==='[';
    const processLoader=token.value==='process'&&items[i+1]?.value==='.'&&['binding','getBuiltinModule','mainModule'].includes(items[i+2]?.value);
    const computedCall=token.value===']'&&items[i+1]?.value==='(';
    if(!sensitive&&!reflectiveProperty&&!processLoader&&!computedCall)continue;
    let start=i,end=i;
    while(items[end+1]?.value==='.'||items[end+1]?.value==='['){
      end=items[end+1].value==='['?closing(end+1):end+2;
    }
    if(items[end+1]?.value==='(')end=closing(end+1);
    else{
      // A capability escaping into an alias/object is itself a reviewed seam.
      while(start>0&&![';','{','}'].includes(items[start-1].value))start--;
      while(end+1<items.length&&![';','}'].includes(items[end+1].value))end++;
    }
    const expression=items.slice(start,end+1);
    bindingSurfaces.push({kind:computedCall?'computed-call':'capability-use',expression:serial(expression),initializers:dependencies(expression)});
  }
  return {imports,literalStrings:[...literals].sort(),dependencySurfaces:surfaces,
    bindingSurfaces,
    computedImportBoundaries:imports.filter(row=>row.specifier===null).map(row=>({expression:row.expression,
      initializers:dependencies(JSON.parse(row.expression).map(([type,value])=>({type,value})))}))};
}

// Filename-looking diagnostic/copy text is not a source read. Only literals
// occurring on an actual dependency/capability boundary (including its traced
// initializer definitions) may contribute a concrete resource edge.
export function dependencySourceLiterals(scan){
  const values=new Set();
  const expression=source=>{
    const parsed=JSON.parse(source);if(!Array.isArray(parsed))throw Error('CONTROL_DEPENDENCY_TOKENS');
    for(const token of parsed){if(!Array.isArray(token)||token.length!==2)throw Error('CONTROL_DEPENDENCY_TOKENS');
      if(token[0]==='string')values.add(token[1]);}
  };
  for(const surface of [...scan.dependencySurfaces,...scan.bindingSurfaces,...scan.computedImportBoundaries]){
    expression(surface.expression);
    for(const [,definitions]of surface.initializers??[])for(const definition of definitions)expression(definition);
  }
  return [...values].sort();
}

