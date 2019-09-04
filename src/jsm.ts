import mixin from './util/mixin';
import plugin from './plugin';

const UNOBSERVED: any = [ null, [] ];
export default class JSM{
	private context: any;
	private config: any;
	public state: string;
	private observers: any[];
	private pending: boolean;

	constructor(context: any, config: any) {
		this.context   = context;
		this.config    = config;
		this.state     = config.init.from;
		this.observers = [context];
	}


	public init(args?: any[]) {
		mixin(this.context, this.config.data.apply(this.context, args));
		plugin.hook(this, 'init');
		if (this.config.init.active)
		  return this.fire(this.config.init.name, []);
	}

	public is(state: string) {
		return Array.isArray(state) ? (state.indexOf(this.state) >= 0) : (this.state === state);
	}

	public isPending() {
		return this.pending;
	}

	public can(transition: string) {
		return !this.isPending() && !!this.seek(transition);
	}

	public cannot(transition: string) {
		return !this.can(transition);
	}

	public allStates() {
		return this.config.allStates();
	}

	public allTransitions() {
		return this.config.allTransitions();
	}

	public transitions() {
		return this.config.transitionsFor(this.state);
	}

	public seek(transition:string, args?: any[]) {
		let wildcard = this.config.defaults.wildcard;
		let entry    = this.config.transitionFor(this.state, transition);
		let to       = entry && entry.to;
		if (typeof to === 'function')
		  return to.apply(this.context, args);
		else if (to === wildcard)
		  return this.state
		else
		  return to
	}

	public fire(transition: string, args: any[]) {
		return this.transit(transition, this.state, this.seek(transition, args), args);
	}

	public transit(transition: string, from: string, to: string, args: any[]) {
		let lifecycle = this.config.lifecycle;
		let changed   = this.config.options.observeUnchangedState || (from !== to);

		if (!to)
		  return this.context.onInvalidTransition(transition, from, to);

		if (this.isPending())
		  return this.context.onPendingTransition(transition, from, to);

		this.config.addState(to);  // might need to add this state if it's unknown (e.g. conditional transition or goto)

		this.beginTransit();

		args.unshift({             // this context will be passed to each lifecycle event observer
		  transition: transition,
		  from:       from,
		  to:         to,
		  fsm:        this.context
		});

		return this.observeEvents([
		            this.observersForEvent(lifecycle.onBefore.transition),
		            this.observersForEvent(lifecycle.onBefore[transition]),
		  changed ? this.observersForEvent(lifecycle.onLeave.state) : UNOBSERVED,
		  changed ? this.observersForEvent(lifecycle.onLeave[from]) : UNOBSERVED,
		            this.observersForEvent(lifecycle.on.transition),
		  changed ? [ 'doTransit', [ this ] ]                       : UNOBSERVED,
		  changed ? this.observersForEvent(lifecycle.onEnter.state) : UNOBSERVED,
		  changed ? this.observersForEvent(lifecycle.onEnter[to])   : UNOBSERVED,
		  changed ? this.observersForEvent(lifecycle.on[to])        : UNOBSERVED,
		            this.observersForEvent(lifecycle.onAfter.transition),
		            this.observersForEvent(lifecycle.onAfter[transition]),
		            this.observersForEvent(lifecycle.on[transition])
		], args);
	}

	private beginTransit(){ 
		this.pending = true;
	}
	
	private endTransit(result: any){ 
		this.pending = false;
		return result;
	}
	
	private failTransit(result: any){ 
		this.pending = false; 
		throw result;
	}
	
	private doTransit(lifecycle: any){
		this.state = lifecycle.to;
	}

	public observe(args: IArguments){
		if (args.length === 2) {
		  let observer:any = {};
		  observer[args[0]] = args[1];
		  this.observers.push(observer);
		}
		else {
		  this.observers.push(args[0]);
		}
	}

	private observersForEvent(event: string) { // TODO: this could be cached
		let n = 0, max = this.observers.length, observer, result = [];
		for( ; n < max ; n++) {
		  observer = this.observers[n];
		  if (observer[event])
		    result.push(observer);
		}
		return [ event, result, true ]
	}

	private observeEvents(events: any[], args: any[], previousEvent?: any, previousResult?: any): any {
		if (events.length === 0) {
		  return this.endTransit(previousResult === undefined ? true : previousResult);
		}

		let event     = events[0][0];
		let observers = events[0][1];
		let pluggable = events[0][2];

		args[0].event = event;
		if (event && pluggable && event !== previousEvent)
		  plugin.hook(this, 'lifecycle', args);

		if (observers.length === 0) {
		  events.shift();
		  return this.observeEvents(events, args, event, previousResult);
		}
		else {
		  let observer = observers.shift(),
		      result = observer[event].apply(observer, args);
		  if (result && typeof result.then === 'function') {
		    return result.then(this.observeEvents.bind(this, events, args, event))
		                 .catch(this.failTransit.bind(this))
		  }
		  else if (result === false) {
		    return this.endTransit(false);
		  }
		  else {
		    return this.observeEvents(events, args, event, result);
		  }
		}
	}

	public onInvalidTransition(transition: string, from: string, to: string) {
		let msg = "transition is invalid in current state:" + transition + "," + from + "," + to + "," + this.state;
		throw new Error(msg);
	}

	public onPendingTransition(transition: string, from: string, to: string) {
		let msg = "transition is invalid while previous transition is still in progress:" + transition + "," + from + "," + to + "," + this.state;
		throw new Error(msg);
	}

}