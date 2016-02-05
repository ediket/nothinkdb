import { expect } from 'chai';
import nothinkdb from '../nothinkdb';


describe('nothinkdb', () => {
  it('should have Link, Model', () => {
    expect(nothinkdb).to.be.ok;
    expect(nothinkdb).to.have.property('Link');
    expect(nothinkdb).to.have.property('Model');
  });
});
