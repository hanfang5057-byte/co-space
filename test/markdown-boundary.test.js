import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boundarySourceOffset} from '../packages/review-ui/src/markdown-dom.js';

/**
 * Minimal DOM doubles: the mapping only compares node identity and asks whether
 * an element contains a candidate, so plain objects model both without jsdom.
 */
const text = value => ({nodeType:3,nodeValue:value,parentElement:{closest:()=>null}});
const element = children => {
  const node={nodeType:1,childNodes:children};
  node.contains=candidate=>candidate===node||children.some(child=>child===candidate||child.contains?.(candidate)===true);
  return node;
};

// "plain **bold** tail" with the spans a synthesized mapping produces.
const plainNode=text('plain ');
const boldNode=text('bold');
const tailNode=text(' tail');
const strong=element([boldNode]);
const paragraph=element([plainNode,strong,tailNode]);
const spans=[
  {element:paragraph,textNode:plainNode,from:11,to:17,textLength:6},
  {element:strong,textNode:boldNode,from:19,to:23,textLength:4},
  {element:paragraph,textNode:tailNode,from:25,to:30,textLength:5},
];

test('an element boundary at the paragraph end resolves past the first inline run',()=>{
  // The paragraph's first mapped run is "plain " (ends at 17); a selection that
  // runs to the paragraph end must end at the trailing run's end (30), and one
  // that stops after the bold child must end at the bold run's end (23).
  assert.equal(boundarySourceOffset(paragraph,3,spans,'end'),30);
  assert.equal(boundarySourceOffset(paragraph,2,spans,'end'),23);
  assert.equal(boundarySourceOffset(paragraph,1,spans,'end'),17);
});

test('an element boundary at a child start resolves to that child first run',()=>{
  assert.equal(boundarySourceOffset(paragraph,0,spans,'start'),11);
  assert.equal(boundarySourceOffset(paragraph,1,spans,'start'),19);
  assert.equal(boundarySourceOffset(paragraph,2,spans,'start'),25);
});

test('a boundary with nothing mapped on one side collapses instead of inventing a range',()=>{
  assert.equal(boundarySourceOffset(paragraph,0,spans,'end'),11);
  assert.equal(boundarySourceOffset(paragraph,3,spans,'start'),30);
});

test('a text boundary still maps inside its own run',()=>{
  assert.equal(boundarySourceOffset(plainNode,0,spans,'start'),11);
  assert.equal(boundarySourceOffset(plainNode,6,spans,'end'),17);
  assert.equal(boundarySourceOffset(boldNode,0,spans,'start'),19);
  assert.equal(boundarySourceOffset(boldNode,4,spans,'end'),23);
});

test('a nested inline element boundary uses the runs inside it',()=>{
  assert.equal(boundarySourceOffset(strong,1,spans,'end'),23);
  assert.equal(boundarySourceOffset(strong,0,spans,'start'),19);
});
