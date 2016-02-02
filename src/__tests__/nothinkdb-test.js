import { expect } from 'chai';
import nothinkdb from '../nothinkdb';


describe('nothinkdb', () => {
  it('should have Link, Model, Table', () => {
    expect(nothinkdb).to.be.ok;
    expect(nothinkdb).to.have.property('Link');
    expect(nothinkdb).to.have.property('Model');
    expect(nothinkdb).to.have.property('Table');
  });
});
