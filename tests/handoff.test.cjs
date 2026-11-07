const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const handoff=require('../implementation-handoff.js');
const components=require('../component-instances.js');
const {reviewHarness}=require('./review-harness.cjs');
const open=reviewHarness();
function doc(){return {version:1,id:'handoff',name:'Example',revisionId:'r1',width:800,height:600,elements:[{id:'label',type:'text',text:'Hello',bounds:{x:10,y:10,width:200,height:40}},{id:'run',type:'button',label:'Run',text:'Run',bounds:{x:10,y:70,width:100,height:40},action:{type:'set-state',state:'default'}}]};}
function proof(extra={}){return {elementId:'run',revisionId:'r1',state:'default',viewport:{width:800,height:600},platform:'macOS arm64',applicationVersion:'1.0',source:'abc123',reference:'/tmp/runtime-report.json',checkedAt:'2026-11-07T10:00:00.000Z',result:'passed',...extra};}
test('handoff reports deterministic component identities, shared tokens and exact runtime evidence scope',()=>{
  let source=components.define(doc(),{id:'button',elements:[{id:'body',type:'container',bounds:{x:0,y:0,width:80,height:30},style:{fill:'#222222'}}]});
  source=components.instantiate(source,{id:'button-a',componentId:'button',x:200,y:100});
  source.tokens={spacing:{deviceGap:4}};source.metadata={runtimeEvidence:[proof()]};
  const before=JSON.stringify(source),report=handoff.create(source);
  assert.equal(JSON.stringify(source),before);assert.deepEqual(handoff.create(source),report);
  assert.equal(report.tokens.spacing.deviceGap,4);assert.equal(report.elements.find(n=>n.id==='label').behavior.kind,'illustrated');
  assert.equal(report.elements.find(n=>n.id==='run').behavior.kind,'runtime-verified');
  assert.equal(report.elements.find(n=>n.id==='button-a--body').component.definitionId,'button');
  const stale=handoff.create({...source,revisionId:'r2'});
  assert.equal(stale.elements.find(n=>n.id==='run').behavior.kind,'frame-interactive');
  const resized=handoff.create(source,{viewport:{width:360,height:740}});
  assert.equal(resized.elements.find(n=>n.id==='run').behavior.runtime,null);
  source.metadata.runtimeEvidence.push(proof({checkedAt:'2026-11-07T11:00:00.000Z',result:'failed'}));
  assert.equal(handoff.create(source).elements.find(n=>n.id==='run').behavior.kind,'frame-interactive','a later failure supersedes a reported pass');
  assert.match(handoff.markdown(report),/implementation handoff/);
  assert.match(handoff.markdown(report),/abc123/);
  source.metadata.runtimeEvidence[0].source='';assert.throws(()=>handoff.create(source),/Runtime evidence/);
});
test('canvas inspection selects real elements without annotation and exports a portable handoff',async t=>{
  const page=await open(t);
  const before=await page.evaluate(()=>Frame.agent.getFeedback());
  await page.locator('#tool-inspect').click();
  const board=await page.locator('#board').boundingBox();
  const node=await page.evaluate(()=>Frame.agent.inspect('instrument',{elementId:'title'})[0]);
  await page.mouse.click(board.x+(node.bounds.x+20)*board.width/1000,board.y+(node.bounds.y+20)*board.height/700);
  assert.equal(await page.locator('#element-inspector strong').textContent(),'title');
  assert.equal(await page.locator('#active-tool').textContent(),'Inspect');
  await page.getByRole('button',{name:'Open implementation handoff'}).click();
  assert.match(await page.locator('#handoff-properties').textContent(),/Illustrated/);
  const waiting=page.waitForEvent('download');await page.locator('#download-handoff-json').click();const downloaded=await waiting;
  const report=JSON.parse(await fs.readFile(await downloaded.path(),'utf8'));
  assert.equal(report.design.id,'instrument');assert.equal(report.format,'frame-implementation-handoff');assert.ok(report.elements.length>0);
  assert.equal(report.design.revisionId,await page.evaluate(()=>Frame.agent.getDocument('instrument').revisionId));
  assert.deepEqual(await page.evaluate(()=>Frame.agent.getFeedback()),before);
  await page.locator('#close-handoff').click();await page.locator('#tool-pen').click();
  assert.equal(await page.locator('#inspection-layer').isVisible(),false);
});
