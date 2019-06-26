import Detector from '../src/detector';

/**
 * Detector test
 */
describe('Detector test', () => {
  it('works if true is truthy', () => {
    expect(true).toBeTruthy();
  });

  it('Detector is instantiable', () => {
    expect(new Detector({})).toBeInstanceOf(Detector);
  });
});
