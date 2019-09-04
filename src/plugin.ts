import mixin from './util/mixin';

module plugin {
  export function build(target: Object, config: any) {
    var n, max, plugin, plugins = config.plugins;
    for(n = 0, max = plugins.length ; n < max ; n++) {
      plugin = plugins[n];
      if (plugin.methods)
        mixin(target, plugin.methods);
      if (plugin.properties)
        Object.defineProperties(target, plugin.properties);
    }
  }

  export function hook(fsm: any, name: string, additional?:any[]) {
    var n, max, method, plugin,
        plugins = fsm.config.plugins,
        args    = [fsm.context];

    if (additional)
      args = args.concat(additional)

    for(n = 0, max = plugins.length ; n < max ; n++) {
      plugin = plugins[n]
      method = plugins[n][name]
      if (method)
        method.apply(plugin, args);
    }
  }
} 

export default plugin;