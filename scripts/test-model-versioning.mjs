const store=new Map();global.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const mod=await import('../js/core/adaptive-model.js');
const first=mod.loadAdaptiveModel();
const second=mod.applyApprovedSuggestion({id:'s1',patch:{scoreAdjustment:3}});
if(second.version!==first.version+1||second.scoreAdjustment!==3)throw new Error('Godkendelse oprettede ikke korrekt modelversion.');
const versions=mod.listAdaptiveModelVersions();if(!versions.some(x=>x.version===first.version)||!versions.some(x=>x.version===second.version))throw new Error('Modelhistorikken mangler versioner.');
const restored=mod.activateAdaptiveModelVersion(first.version);if(restored.version!==second.version+1||restored.restoredFromVersion!==first.version)throw new Error('Rollback oprettede ikke en ny revisionsversion.');
console.log('Modelversioner, godkendelse og rollback bestået.');
