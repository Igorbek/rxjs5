import * as Rx from '../../dist/cjs/Rx.KitchenSink';
import '../../dist/cjs/add/observable/generate';
import {TestScheduler} from '../../dist/cjs/testing/TestScheduler';
declare const {expectObservable};
declare const rxTestScheduler: TestScheduler;

const Observable = Rx.Observable;

describe('Observable.generate', () => {
  it('should complete if condition does not meet', () => {
    const source = Observable.generate(1, x => false, x => x + 1);
    const expected = '|';

    expectObservable(source).toBe(expected);
  });
  it('should produce first value immediately', () => {
    const source = Observable.generate(1, x => x == 1, x => x + 1);
    const expected = '(1|)';

    expectObservable(source).toBe(expected, { '1': 1 });
  });
  it('should produce all values synchronously', () => {
    const source = Observable.generate(1, x => x < 3, x => x + 1);
    const expected = '(12|)';

    expectObservable(source).toBe(expected, { '1': 1, '2': 2 });
  });
  it('should use result selector', () => {
    const source = Observable.generate(1, x => x < 3, x => x + 1, x => (x + 1).toString());
    const expected = '(23|)';

    expectObservable(source).toBe(expected);
  });
  it('should stop producing when unsubscribed', () => {
    const source = Observable.generate(1, x => x < 4, x => x + 1);
    let count = 0;
    const subscriber = new Rx.Subscriber<number>(
      x => {
        count++;
        if (x == 2) {
          subscriber.unsubscribe();
        }
      }
    );
    source.subscribe(subscriber);
    expect(count).toBe(2);
  });
  it('should accept a scheduler', () => {
    const source = Observable.generate({
      initialState: 1,
      condition: x => x < 4,
      iterate: x => x + 1,
      resultSelector: x => x,
      scheduler: rxTestScheduler});
    const expected = '(123|)';

    let count = 0;
    source.subscribe(x => count++);

    expect(count).toBe(0);
    rxTestScheduler.flush();
    expect(count).toBe(3);

    expectObservable(source).toBe(expected, { '1': 1, '2': 2, '3': 3 });
  });
});