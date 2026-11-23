import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotationConnector } from '../packages/review-ui/src/annotation-connector.js';

test('connector leaves the last line at its baseline and reaches the card edge smoothly', () => {
  const line=annotationConnector({right:120,bottom:80},300,100,80,270);
  assert.deepEqual({x1:line.x1,y1:line.y1,x2:line.x2,y2:line.y2},{x1:120,y1:79,x2:300,y2:124});
  assert.equal(line.d,'M 120 79 C 125 79, 126 87, 134 87 L 262 87 C 281 87, 281 124, 300 124');
});

test('connector keeps its target inside a short card', () => {
  const line=annotationConnector({right:40,bottom:20},100,25,30,80);
  assert.equal(line.y2,40);
});
