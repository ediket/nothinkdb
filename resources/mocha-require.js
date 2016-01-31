/* eslint vars-on-top: 0, no-var: 0 */
require('babel/register')({});

var chai = require('chai');
var chaiSubset = require('chai-as-promised');
chai.use(chaiSubset);
