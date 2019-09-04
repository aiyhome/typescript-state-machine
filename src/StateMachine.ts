'use strict'

import mixin  from './util/mixin'
import camelize from './util/camelize'
import plugin from './plugin'
import Config from './config'
import JSM from './jsm'

export default class StateMachine {
  public static version:string  = '3.0.1';
  public static defaults:any = {
    wildcard: '*',
    init: {
      name: 'init',
      from: 'none'
    }
  }

  private _fsm: JSM;
  constructor(options: any) {
    let config = new Config(options, StateMachine);
    plugin.build(this, config);
    mixin(this, config.methods);

    let target:any = this;
    config.allTransitions().forEach(function(transition: string) {
      target[camelize(transition)] = function() {
        return target._fsm.fire(transition, [].slice.call(arguments))
      }
    });

    this._fsm = new JSM(this, config);
    this._fsm.init();

    Object.defineProperties(target, {
      state: {
        configurable: false,
        enumerable:   true,
        get: function() {
          return this._fsm.state;
        },
        set: function(state: string) {
          throw Error('use transitions to change state')
        }
      }
    });
  }

  public fire(transition: string, ...args: any[]){
    return this._fsm.fire(transition, args)
  }

  public is(state: string) { 
    return this._fsm.is(state)                                  
  }

  public can(transition: string) { 
    return this._fsm.can(transition)                               
  }

  public cannot(transition: string) { 
    return this._fsm.cannot(transition)
  }
  
  public observe(){ 
    return this._fsm.observe(arguments)                            
  }

  public transitions(){ 
    return this._fsm.transitions()                                 
  }

  public allTransitions(){ 
    return this._fsm.allTransitions()                              
  }
  
  public allStates(){ 
    return this._fsm.allStates()
  }

  public onInvalidTransition(t: string, from: string, to: string) { 
    return this._fsm.onInvalidTransition(t, from, to)
  }
  
  public onPendingTransition(t: string, from: string, to: string) { 
    return this._fsm.onPendingTransition(t, from, to)              
  }
}