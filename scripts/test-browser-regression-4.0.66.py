import asyncio, contextlib, json, os, socket, subprocess, sys, time
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
PORT=8766

async def main():
    server=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        await asyncio.sleep(.8)
        async with async_playwright() as p:
            browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            context=await browser.new_context()
            page=await context.new_page()
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            # Owner-session already established. This verifies that the existing setup is consumed, not recreated.
            await page.add_init_script("""localStorage.setItem('ravradar-auth-session',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:4102444800,user:{id:'owner-test',email:'owner@example.test'}}));""")
            async def route_handler(route):
                url=route.request.url
                if '/rest/v1/profiles' in url:
                    await route.fulfill(status=200,content_type='application/json',body=json.dumps([{'id':'owner-test','email':'owner@example.test','display_name':'Owner','role':'owner','is_active':True}]))
                elif '/rest/v1/user_permissions' in url:
                    await route.fulfill(status=200,content_type='application/json',body='[]')
                elif '/rest/v1/admin_documents' in url:
                    await route.fulfill(status=200,content_type='application/json',body='[]')
                elif '/auth/v1/' in url:
                    await route.fulfill(status=200,content_type='application/json',body=json.dumps({'access_token':'test-token','refresh_token':'test-refresh','expires_at':4102444800,'user':{'id':'owner-test'}}))
                else:
                    await route.continue_()
            await context.route('**/supabase.co/**',route_handler)
            await page.goto(f'http://127.0.0.1:{PORT}/admin.html',wait_until='domcontentloaded')
            await page.wait_for_selector('body.admin-unlocked',timeout=15000)
            if await page.locator('.admin-auth-gate').is_visible():
                raise RuntimeError('Admin-gate blev ikke skjult')
            # Public page must render rather than remain blank.
            public=await context.new_page()
            public_errors=[]
            public.on('pageerror',lambda e: public_errors.append(str(e)))
            await public.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded')
            await public.wait_for_selector('#map',timeout=15000)
            await public.wait_for_timeout(2000)
            fatal=[e for e in errors+public_errors if 'ResizeObserver loop' not in e]
            if fatal:
                raise RuntimeError('Browserfejl: '+' | '.join(fatal[:5]))
            await browser.close()
        print('OK: browser-regression – offentlig side og owner-admin åbner med eksisterende Supabase-session.')
    finally:
        server.terminate()
        with contextlib.suppress(Exception): server.wait(timeout=3)

if __name__=='__main__': asyncio.run(main())
