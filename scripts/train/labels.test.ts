import test from 'node:test';
import assert from 'node:assert/strict';
import {regionOf} from './labels.ts';
test('documented Polissia and Podillia regions remain distinct',()=>{
 for(const [input,expected] of [['Житомирське Полісся','Zhytomyr Polissia'],['Чернігівське Полісся','Chernihiv Polissia'],['Волинське Полісся','Volyn Polissia'],['Східне Поділля','Eastern Podillia'],['Західне Поділля','Western Podillia'],['Опілля','Opillia']])assert.equal(regionOf({region:input}),expected);
 assert.equal(regionOf({region:'Poltava'}),'Poltava');
});
