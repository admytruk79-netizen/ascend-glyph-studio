import {strict as assert} from "node:assert";
import {pointInPolygon,polygonArea,polygonDistance,polygonInsideWithClearance,polygonsIntersect} from "./polygon-geometry";

const concave=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:60,y:100},{x:60,y:40},{x:40,y:40},{x:40,y:100},{x:0,y:100}];
assert.equal(pointInPolygon({x:20,y:80},concave),true);
assert.equal(pointInPolygon({x:50,y:80},concave),false);

const falseBoxPositive=[{x:45,y:70},{x:55,y:70},{x:55,y:90},{x:45,y:90}];
assert.equal(polygonsIntersect(concave,falseBoxPositive),false);
assert.equal(polygonInsideWithClearance(falseBoxPositive,concave,0),false);

const outer=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
const inner=[{x:10,y:10},{x:30,y:10},{x:30,y:30},{x:10,y:30}];
assert.equal(polygonInsideWithClearance(inner,outer,10),true);
assert.equal(polygonInsideWithClearance(inner,outer,10.1),false);
assert.equal(polygonArea(inner),400);

const noGo=[{x:50,y:50},{x:60,y:50},{x:60,y:60},{x:50,y:60}];
const near=[{x:62,y:50},{x:70,y:50},{x:70,y:60},{x:62,y:60}];
assert.equal(polygonDistance(near,noGo),2);
assert.equal(polygonsIntersect(near,noGo),false);
