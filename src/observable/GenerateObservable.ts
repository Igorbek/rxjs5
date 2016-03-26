import {Observable} from '../Observable' ;
import {Scheduler} from '../Scheduler';
import {Subscriber} from '../Subscriber';
import {Subscription} from '../Subscription';
import {Action} from '../scheduler/Action';

import {isScheduler} from '../util/isScheduler';

const selfSelector = <T>(value: T) => value;

export type ConditionFunc<S> = (state: S) => boolean;
export type IterateFunc<S> = (state: S) => S;
export type ResultFunc<S, T> = (state: S) => T;

interface SchedulerState<T, S> {
  state: S;
  params: {
    subscriber: Subscriber<T>;
    condition?: ConditionFunc<S>;
    iterate: IterateFunc<S>;
    resultSelector: ResultFunc<S, T>;
  };
}

export interface GenerateOptions<T, S> {
  initialState: S;
  condition?: ConditionFunc<S>;
  iterate: IterateFunc<S>;
  resultSelector: ResultFunc<S, T>;
  scheduler?: Scheduler;
}

export class GenerateObservable<T, S> extends Observable<T> {
  constructor(
    private initialState: S,
    private condition: ConditionFunc<S>,
    private iterate: IterateFunc<S>,
    private resultSelector: ResultFunc<S, T>,
    private scheduler?: Scheduler) {
      super();
  }

  static create<T, S>(
    initialState: S,
    condition: ConditionFunc<S>,
    iterate: IterateFunc<S>,
    resultSelector: ResultFunc<S, T>,
    scheduler?: Scheduler): Observable<T>
  static create<S>(
    initialState: S,
    condition: ConditionFunc<S>,
    iterate: IterateFunc<S>,
    scheduler?: Scheduler): Observable<S>
  static create<T, S>(
    options: GenerateOptions<T, S>): Observable<T>
  static create<T, S>(
    initialStateOrOptions: S | GenerateOptions<T, S>,
    condition?: ConditionFunc<S>,
    iterate?: IterateFunc<S>,
    resultSelectorOrObservable?: (ResultFunc<S, T>) | Scheduler,
    scheduler?: Scheduler): Observable<T> {
    if (arguments.length == 1) {
      return new GenerateObservable<T, S>(
        (<GenerateOptions<T, S>>initialStateOrOptions).initialState,
        (<GenerateOptions<T, S>>initialStateOrOptions).condition,
        (<GenerateOptions<T, S>>initialStateOrOptions).iterate,
        (<GenerateOptions<T, S>>initialStateOrOptions).resultSelector || selfSelector,
        (<GenerateOptions<T, S>>initialStateOrOptions).scheduler);
    }

    if (resultSelectorOrObservable === undefined || isScheduler(resultSelectorOrObservable)) {
      return new GenerateObservable<T, S>(
        <S>initialStateOrOptions,
        condition,
        iterate,
        selfSelector,
        <Scheduler>resultSelectorOrObservable);
    }

    return new GenerateObservable<T, S>(
      <S>initialStateOrOptions,
      condition,
      iterate,
      <ResultFunc<S, T>>resultSelectorOrObservable,
      <Scheduler>scheduler);
  }

  protected _subscribe(subscriber: Subscriber<any>): Subscription | Function | void {
    let state = this.initialState;
    if (this.scheduler) {
      return this.scheduler.schedule<SchedulerState<T, S>>(GenerateObservable.dispatch, 0, {
        params: {
          subscriber,
          iterate: this.iterate,
          condition: this.condition,
          resultSelector: this.resultSelector
        }, state });
    }
    do {
      if (!this.condition(state)) {
        subscriber.complete();
        break;
      }
      let value = this.resultSelector(state);
      subscriber.next(value);
      if (subscriber.isUnsubscribed) {
        break;
      }
      state = this.iterate(state);
    } while (true);
  }

  private static dispatch<T, S>(state: SchedulerState<T, S>) {
    if (state.params.subscriber.isUnsubscribed) {
      return;
    }
    if (!state.params.condition(state.state)) {
      state.params.subscriber.complete();
      return;
    }
    const value = state.params.resultSelector(state.state);
    state.params.subscriber.next(value);
    if (state.params.subscriber.isUnsubscribed) {
      return;
    }
    const nextState = state.params.iterate(state.state);
    (<Action><any>this).schedule({ state: nextState, params: state.params });
  }
}