import { expect } from 'chai';
import nothinkdb from '../nothinkdb';


describe('nothinkdb', () => {
  it('should have Table', () => {
    expect(nothinkdb).to.be.ok;
    expect(nothinkdb).to.have.property('Table');
  });
});
