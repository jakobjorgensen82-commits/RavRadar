import fs from 'node:fs';
const admin=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
const site=fs.readFileSync('js/services/site-function-test-service.js','utf8');
const html=fs.readFileSync('admin.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
function ok(v,m){if(!v)throw new Error(m)}
ok(/render\(\);\r?\n }catch\(error\)/.test(admin),'Dashboard renderes ikke straks efter godkendt adgang.');
ok(admin.includes("document.body.dataset.adminReady='true'"),'Admin mangler entydig ready-markør.');
ok(admin.includes('SITE_TEST_MODE'),'Admin mangler særskilt testtilstand.');
ok(admin.includes('ravradar:test-permission-denied'),'Rettighedsafvisninger kan ikke opsamles af sitetesten.');
ok(site.includes("dataset?.adminReady==='true'"),'Sitetesten venter ikke på færdig admininitialisering.');
ok(site.includes("win.alert=message=>dialogs.push"),'Sitetesten opsamler ikke browserdialoger.');
ok(site.includes('Offentlig side, admin, service worker og version.json'),'Versionskontrollen bruger ikke de faktiske runtimekilder.');
ok(html.includes(pkg.version),`admin.html er ikke opdateret til ${pkg.version}.`);
console.log('OK: Oversigt renderes ved første åbning, og sitetesten venter på færdig admin uden popup-dialoger.');
