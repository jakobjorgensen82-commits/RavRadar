import fs from 'node:fs';

const adminHtml=fs.readFileSync('admin.html','utf8');
const dashboard=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
const reviewStore=fs.readFileSync('js/services/handbook-review-store.js','utf8');
const siteTest=fs.readFileSync('js/services/site-function-test-service.js','utf8');

const failures=[];
const requireMatch=(source,re,label)=>{if(!re.test(source))failures.push(label);};

requireMatch(adminHtml,/admin-dashboard\.js\?v=4\.0\.86/,'Aktiv admin skal indlæse admin-dashboard.js 4.0.86.');
requireMatch(dashboard,/id="handbookReviewQueue"/,'Håndbogsfanen mangler en synlig reviewkø.');
requireMatch(dashboard,/id="handbookLocalDrafts"/,'Håndbogsfanen mangler synlige lokale nødkladder.');
requireMatch(dashboard,/open-review-after-save/,'Kvitteringen efter reviewgemning mangler direkte adgang til reviewkøen.');
requireMatch(dashboard,/save-implementation/,'Reviewkøen mangler en implementeringsproces.');
requireMatch(dashboard,/saveAdminDocumentNow\('handbook'/,'Implementering af review gemmer ikke den centrale håndbog.');
requireMatch(reviewStore,/retryLocalHandbookDraft/,'Lokale nødkladder kan ikke gensendes.');
requireMatch(reviewStore,/deleteLocalHandbookDraft/,'Lokale nødkladder kan ikke slettes.');
requireMatch(dashboard,/Gældende sandhed/,'Dokumentationscenteret mangler Current Truth.');
requireMatch(dashboard,/Implementeringsstatus/,'Dokumentationscenteret mangler implementeringsstatus.');
requireMatch(dashboard,/Kendte problemer/,'Dokumentationscenteret mangler kendte problemer.');
requireMatch(dashboard,/ny lokal modelversion i denne browser/,'Model-forslag forklarer ikke, at ændringen er lokal.');
requireMatch(siteTest,/Manglende fil \(404\)/,'Sitetesten skelner ikke 404 fra timeout.');
requireMatch(siteTest,/Timeout/,'Sitetesten mangler særskilt timeoutklassifikation.');
requireMatch(siteTest,/networkAndDataMs/,'Performanceprofilen mangler netværk/data.');
requireMatch(siteTest,/calculationMs/,'Performanceprofilen mangler beregning.');
requireMatch(siteTest,/renderingMs/,'Performanceprofilen mangler rendering.');
requireMatch(siteTest,/håndbogsreview/,'Sitetesten mangler reachability-kontrol af håndbogsreview.');

if(failures.length){console.error('Feature-reachability fejlede:\n- '+failures.join('\n- '));process.exit(1);}
console.log('Feature-reachability bestået: reviewkø, nødkladder, dokumentation, lokal modelstatus og sitetestdiagnostik er synligt forbundet.');
