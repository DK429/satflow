const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdir, readFile } = require('node:fs/promises');
const { chromium, webkit } = require('playwright');
const url = process.env.SATFLOW_TEST_URL || 'http://127.0.0.1:8767';
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No page-level horizontal overflow');
}
async function seed(page) {
  return page.evaluate(async () => {
    const { state } = await import('./scripts/state.js');
    const { renderResults, updateLastSampleSummary } = await import('./scripts/results.js');
    state.samples = Array.from({length: 12}, (_, i) => ({sampleNo:i+1,pcu:5+i,seconds:10+i,flowPcuPerHour:(5+i)/(10+i)*3600,car:2,lgv:1,hgv:1,cycle:1}));
    renderResults(); updateLastSampleSummary();
  });
}
function parseCSV(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {
      if(quoted && text[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    } else if(c===',' && !quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r') && !quoted) {
      if(c==='\r' && text[i+1]==='\n')i++;
      row.push(cell);rows.push(row);row=[];cell='';
    } else cell+=c;
  }
  if(cell || row.length){row.push(cell);rows.push(row);}
  assert.equal(quoted,false,'CSV quote pairs must close');
  return rows;
}
for (const [engine, type] of Object.entries({chromium, webkit})) {
  test(engine + ': navigation preserves active timing, delay and counts; live flow clears', async () => {
    const browser=await type.launch();
    try {
      const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
      await page.goto(url);
      await page.locator('#delay').fill('2');
      await page.locator('#start-measurements').tap();
      await page.evaluate(()=>document.getElementById('live-flow').textContent='9999');
      await page.locator('#green-btn').tap();
      assert.equal(await page.locator('#live-flow').textContent(),'—');
      const start=await page.evaluate(async()=> (await import('./scripts/state.js')).state.startTime);
      for(const tab of ['results','site','measure']) await page.locator('[data-tab="'+tab+'"]').tap();
      assert.ok(await page.locator('#end-of-sat-btn').isVisible());
      assert.ok(await page.locator('#green-btn').isHidden());
      assert.ok(await page.locator('#btn-car').isDisabled());
      assert.equal(await page.evaluate(async()=> (await import('./scripts/state.js')).state.startTime),start);
      await page.waitForFunction(()=>!document.getElementById('btn-car').disabled);
      await page.locator('#btn-car').tap();
      for(const tab of ['results','measure']) await page.locator('[data-tab="'+tab+'"]').tap();
      assert.equal(await page.locator('#pcu-display').textContent(),'1.0');
      assert.ok(await page.locator('#end-of-sat-btn').isVisible());
      assert.ok(await page.locator('#btn-lgv').isEnabled());
      await page.locator('#btn-lgv').tap();
      await page.locator('#end-of-sat-btn').tap();
      assert.equal(await page.locator('#live-flow').textContent(),'—');
      const samples=await page.evaluate(async()=> (await import('./scripts/state.js')).state.samples);
      assert.equal(samples.length,1);assert.equal(samples[0].pcu,2.5);
      assert.equal(samples[0].car,1);assert.equal(samples[0].lgv,1);
      assert.ok(samples[0].seconds>0);
    } finally {await browser.close();}
  });
  test(engine + ': ending early cancels previous delay; metadata and versions round-trip', async () => {
    const browser=await type.launch();
    try {
      const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,acceptDownloads:true});
      await page.goto(url);
      const metadata={site:'511bw',junction:'Road "A", Road B\nNorth arm',arm:'Lane "1"',surveyor:'D, "K"',date:'2026-10-04',notes:'First "note", here\nSecond line'};
      for(const [id,value] of Object.entries(metadata)) {
        // Text inputs normalise newlines; notes remains a multiline textarea.
        if(id!=='junction') await page.locator('#'+id).fill(value);
        else await page.locator('#'+id).fill('Road "A", Road B');
      }
      await page.locator('#delay').fill('2');
      await page.locator('#start-measurements').tap();
      const {site:siteData}=await page.evaluate(async()=> (await import('./scripts/state.js')).state);
      const version=await page.locator('.app-version').textContent();
      await page.clock.install({time:new Date('2026-10-04T12:00:00Z')});
      await page.clock.pauseAt(new Date('2026-10-04T12:00:00Z'));
      await page.evaluate(()=>document.getElementById('green-btn').click());
      await page.clock.runFor(500);
      await page.evaluate(()=>document.getElementById('end-of-sat-btn').click());
      await page.evaluate(()=>document.getElementById('green-btn').click());
      await page.clock.runFor(1501);
      assert.ok(await page.locator('#btn-car').isDisabled(),'Previous timeout must not enable a new run early');
      await page.clock.runFor(500);
      assert.ok(await page.locator('#btn-car').isEnabled());
      await page.evaluate(()=>document.getElementById('btn-car').click());
      await page.clock.runFor(1000);
      await page.evaluate(()=>document.getElementById('end-of-sat-btn').click());
      const samples=await page.evaluate(async()=> (await import('./scripts/state.js')).state.samples);
      assert.equal(samples.length,2);assert.equal(samples[0].seconds,0);
      assert.equal(samples[1].pcu,1);assert.ok(Math.abs(samples[1].seconds-1.001)<0.03);
      await page.evaluate(()=>document.getElementById('end-survey-btn').click());
      for(const format of ['csv','txt']) {
        const promise=page.waitForEvent('download');
        await page.evaluate(id=>document.getElementById(id).click(),'export-'+format);
        const download=await promise;
        const text=await readFile(await download.path(),'utf8');
        assert.ok(text.includes('SATFlow '+version+' (mobile, modular)'));
        if(format==='csv') {
          const rows=parseCSV(text);
          for(const [label,key] of [['Site','site'],['Junction','junction'],['Arm/Lane','arm'],['Surveyor','surveyor'],['Date','date'],['Notes','notes']])
            assert.equal(rows.find(row=>row[0]===label)[1],siteData[key]);
          assert.equal(rows.filter(row=>/^\d+$/.test(row[0])).length,2);
        } else assert.ok(text.includes(siteData.notes));
      }
    } finally {await browser.close();}
  });
  for (const width of [320, 360, 375, 393, 402, 430]) {
    test(engine + ': ' + width + 'px layout, rotation and larger text', async () => {
      const browser = await type.launch();
      try {
        const page = await browser.newPage({viewport:{width,height:812},isMobile:true,hasTouch:true});
        const errors=[]; page.on('pageerror',e=>errors.push(e.message));
        await page.goto(url); await page.locator('#date').waitFor();
        await page.locator('#site').fill('511bw');
        await page.locator('#junction').fill('Doncaster Road / Black Road');
        await page.locator('#delay').fill('0');
        const widths = await page.locator('#site-form input').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));
        assert.ok(widths.every(w=>Math.abs(w-widths[0])<1));
        await noOverflow(page);
        await page.locator('#start-measurements').tap();
        await seed(page);
        const circle=await page.locator('#green-btn').boundingBox();
        assert.equal(circle.width,164); assert.equal(circle.height,164);
        assert.equal(await page.locator('#last-sample-no').textContent(),'12');
        for(const viewport of [{width:812,height:width},{width,height:812},{width:812,height:width},{width,height:812}]) {
          await page.setViewportSize(viewport); await noOverflow(page);
        }
        await page.locator('#green-btn').tap();
        await page.waitForFunction(()=>!document.getElementById('btn-car').disabled);
        await page.locator('#btn-car').tap();
        await page.setViewportSize({width:812,height:width});
        await page.setViewportSize({width,height:812});
        assert.equal(await page.locator('#pcu-display').textContent(),'1.0');
        assert.ok(await page.locator('#end-of-sat-btn').isVisible());
        await page.locator('#end-of-sat-btn').tap();
        await page.locator('#delete-last-btn').tap();
        assert.equal(await page.locator('#last-sample-no').textContent(),'12');
        await page.locator('#end-survey-btn').tap();
        await page.waitForFunction(()=>document.querySelectorAll('#results-body .recent-sample').length===2);
        assert.equal(await page.locator('#results-body tr:visible').count(),2);
        assert.equal(await page.locator('#results-body tr').first().locator('td').first().textContent(),'12');
        await page.locator('#samples-toggle').tap();
        assert.equal(await page.locator('#results-body tr:visible').count(),12);
        await page.locator('#samples-toggle').tap();
        await page.addStyleTag({content:'body {font-size:20px} button,input,textarea {font-size:20px}'});
        await noOverflow(page);
        for(const tab of ['site','measure','results']) {
          await page.locator('[data-tab="'+tab+'"]').tap();
          await noOverflow(page);
          if(process.env.SATFLOW_SCREENSHOTS && [320,402].includes(width)) {
            await mkdir('test-artifacts',{recursive:true});
            await page.screenshot({path:'test-artifacts/'+engine+'-'+width+'-'+tab+'.png',fullPage:true});
          }
        }
        assert.deepEqual(errors,[]);
      } finally { await browser.close(); }
    });
  }
  test(engine + ': touch recording, delay, deletion, full CSV/TXT export and reset', async () => {
    const browser=await type.launch();
    try {
      const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,acceptDownloads:true});
      await page.goto(url);
      await page.locator('#site').fill('511bw');
      await page.locator('#arm').fill('Northbound');
      await page.locator('#delay').fill('0.2');
      await page.locator('#start-measurements').tap();
      await page.locator('#green-btn').tap();
      assert.ok(await page.locator('#btn-car').isDisabled());
      await page.waitForFunction(()=>!document.getElementById('btn-car').disabled);
      for (const id of ['car','lgv','hgv','cycle']) await page.locator('#btn-'+id).tap();
      assert.equal(await page.locator('#pcu-display').textContent(),'5.0');
      await page.locator('#end-of-sat-btn').tap();
      const sample = await page.evaluate(async()=> (await import('./scripts/state.js')).state.samples[0]);
      assert.equal(sample.pcu,5);
      for(const field of ['car','lgv','hgv','cycle']) assert.equal(sample[field],1);
      assert.ok(sample.seconds>0);
      assert.equal(sample.flowPcuPerHour,5/sample.seconds*3600);
      assert.equal(await page.locator('#last-flow').textContent(),sample.flowPcuPerHour.toFixed(1));
      await seed(page);
      await page.locator('#delete-last-btn').tap();
      assert.equal(await page.locator('#last-sample-no').textContent(),'11');
      await page.locator('#end-survey-btn').tap();
      for(const format of ['csv','txt']) {
        const downloadPromise=page.waitForEvent('download');
        await page.locator('#export-'+format).tap();
        const download=await downloadPromise;
        assert.equal(download.suggestedFilename(),'511bw_Northbound.'+format);
        const text=await readFile(await download.path(),'utf8');
        assert.ok(text.includes('511bw'));
        assert.ok(text.includes('Lane Saturation Flow'));
        if(format==='csv') assert.equal(text.split(/\r?\n/).filter(line=>/^\d+,/.test(line)).length,11);
        else assert.equal(text.split(/\r?\n/).filter(line=>/^\s+\d+\s+\d+\.\d/.test(line)).length,11);
      }
      await page.locator('#reset-survey-btn').tap();
      assert.equal(await page.locator('#results-body tr').count(),0);
      assert.ok(await page.locator('#samples-empty').isVisible());
      assert.ok(await page.locator('#samples-toggle').isHidden());
    } finally { await browser.close(); }
  });
}
