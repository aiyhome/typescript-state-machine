import mixin from './util/mixin';
import camelize from './util/camelize';

export default class Config {
  private options: any;
  private defaults: any;
  private states: string[];
  private transitions: string[];
  private map: {[index:string]:any};
  private lifecycle: {[index:string]:any};
  private init: any;
  private data: Function;
  public methods: any;
  private plugins: any[];
  constructor(options: any, StateMachine: any) {
      options = options || {};

      this.options     = options; // preserving original options can be useful (e.g visualize plugin)
      this.defaults    = StateMachine.defaults;
      this.states      = [];
      this.transitions = [];
      this.map         = {};
      this.lifecycle   = this.configureLifecycle();
      this.init        = this.configureInitTransition(options.init);
      this.data        = this.configureData(options.data);
      this.methods     = this.configureMethods(options.methods);

      this.map[this.defaults.wildcard] = {};

      this.configureTransitions(options.transitions || []);

      this.plugins = this.configurePlugins(options.plugins, StateMachine.plugin);
  }

  private configureLifecycle(){
    return {
      onBefore: { transition: 'onBeforeTransition' },
      onAfter:  { transition: 'onAfterTransition'  },
      onEnter:  { state:      'onEnterState'       },
      onLeave:  { state:      'onLeaveState'       },
      on:       { transition: 'onTransition'       }
    };
  }

  private configureInitTransition(init: any) {
    if (typeof init === 'string') {
      return this.mapTransition(mixin({}, this.defaults.init, { to: init, active: true }));
    }
    else if (typeof init === 'object') {
      return this.mapTransition(mixin({}, this.defaults.init, init, { active: true }));
    }
    else {
      this.addState(this.defaults.init.from);
      return this.defaults.init;
    }
  }

  private configureData(data: any) {
    if (typeof data === 'function')
      return data;
    else if (typeof data === 'object')
      return function() { return data; }
    else
      return function() { return {};  }
  }

  private configureMethods(methods: Object) {
    return methods || {};
  }

  private configureTransitions(transitions: any[]) {
    var i, n, transition, from, to, wildcard = this.defaults.wildcard;
    for(n = 0 ; n < transitions.length ; n++) {
      transition = transitions[n];
      from  = Array.isArray(transition.from) ? transition.from : [transition.from || wildcard]
      to    = transition.to || wildcard;
      for(i = 0 ; i < from.length ; i++) {
        this.mapTransition({ name: transition.name, from: from[i], to: to });
      }
    }
  }

  private configurePlugins(plugins: any[], builtin: boolean) {
    plugins = plugins || [];
    var n, max, plugin;
    for(n = 0, max = plugins.length ; n < max ; n++) {
      plugin = plugins[n];
      if (typeof plugin === 'function')
        plugins[n] = plugin = plugin()
      if (plugin.configure)
        plugin.configure(this);
    }
    return plugins
  }

  private mapTransition(transition: {[index: string]: string}) {
    var name = transition.name,
        from = transition.from,
        to   = transition.to;
    this.addState(from);
    if (typeof to !== 'function')
      this.addState(to);
    this.addTransition(name);
    this.map[from][name] = transition;
    return transition;
  }

  private addState(name: string) {
    if (!this.map[name]) {
      this.states.push(name);
      this.addStateLifecycleNames(name);
      this.map[name] = {};
    }
  }

  private addStateLifecycleNames(name: string) {
    this.lifecycle.onEnter[name] = camelize.prepended('onEnter', name);
    this.lifecycle.onLeave[name] = camelize.prepended('onLeave', name);
    this.lifecycle.on[name]      = camelize.prepended('on',      name);
  }

  private addTransition(name: string) {
    if (this.transitions.indexOf(name) < 0) {
      this.transitions.push(name);
      this.addTransitionLifecycleNames(name);
    }
  }

  private addTransitionLifecycleNames(name: string) {
    this.lifecycle.onBefore[name] = camelize.prepended('onBefore', name);
    this.lifecycle.onAfter[name]  = camelize.prepended('onAfter',  name);
    this.lifecycle.on[name]       = camelize.prepended('on',       name);
  }


  private transitionFor(state: string, transition: string) {
    var wildcard = this.defaults.wildcard;
    return this.map[state][transition] ||
           this.map[wildcard][transition];
  }

  private transitionsFor(state: string) {
    var wildcard = this.defaults.wildcard;
    return Object.keys(this.map[state]).concat(Object.keys(this.map[wildcard]));
  }

  private allStates() {
    return this.states;
  }

  public allTransitions() {
    return this.transitions;
  }
}