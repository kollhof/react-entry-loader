import getTemplateRunner from './template';


const templateHandlersByLoaderCtx = new WeakMap();

const setTemplateHandler = (loaderCtx, handler)=> (
  templateHandlersByLoaderCtx.set(loaderCtx, handler)
);
export const getTemplateHandler = (loaderCtx)=> (
  templateHandlersByLoaderCtx.get(loaderCtx)
);


const loaderDataByModule = new WeakMap();

const setLoaderData = (module, data)=> loaderDataByModule.set(module, data);
const getLoaderData = (module)=> loaderDataByModule.get(module);


/**
 * Return a `{scripts, styles}` object containing
 * all chunks for a given `entry` separated
 * into js scripts and css style sheets.
 */
const getFiles = (entry)=> {
  const files = [];
  for (const chunk of entry.chunks) {
    files.push(...chunk.files);
  }
  const scripts = files.filter((fle)=> fle.endsWith('.js'));
  const styles = files.filter((fle)=> fle.endsWith('.css'));

  return {scripts, styles};
};


function* getDependencies(parentModule, processed=new Set()) {
  if (!parentModule || processed.has(parentModule)) {
    return;
  }

  processed.add(parentModule);
  yield parentModule;

  for (const {module} of parentModule.dependencies) {
    // TODO: find test to deal with non-module dependencies
    /* istanbul ignore else */
    if (module) {
      yield * getDependencies(module.rootModule || module, processed);
    }
  }
}


function* chunkEntryModules(compilation) {
  for (const entry of compilation.entrypoints.values()) {
    for (const {entryModule} of entry.chunks) {
      yield [entry, entryModule];
    }
  }
}


function* findEntries(compilation) {
  for (const [entry, entryModule] of chunkEntryModules(compilation)) {
    for (const module of getDependencies(entryModule)) {
      const data = getLoaderData(module);
      if (data) {
        yield [entry, module, data];
        break;
      }
    }
  }
}


/**
 * Return a tapable hook that will add HTML assets to the `compilation`
 * for every entry module that has a template generated by compatible loaders.
 */
const addHtmlAssets = (compilation)=> async ()=> {
  const genHtml = getTemplateRunner(compilation);

  for (const [entry, module, loaderData] of findEntries(compilation)) {
    const {output, template, props} = loaderData;
    const {scripts, styles} = getFiles(entry);
    const {resource, context} = module;

    const templateProps = {...props, scripts, styles};
    const html = await genHtml(resource, context, template, templateProps);

    compilation.assets[output] = {
      source: ()=> html,
      size: ()=> html.length
    };
  }
};


/**
 * Register a callback on the `module` loader `context`.
 *
 * The callback allows any compatible loader to report a template back
 * to this plugin.
 */
const registerModuleLoaderCallback = (loaderCtx, module)=> {
  setTemplateHandler(loaderCtx, (data)=> setLoaderData(module, data));
};


/**
 * Return a tapable hook for the plugin named `name` that registers
 * hooks for the given `compilation` to generate HTML assets for
 * templates set by any compatible loader e.g. `react-entry-loader`.
 */
const getCompilationHook = (name)=> (compilation)=> {
  const {hooks} = compilation;

  hooks.additionalAssets.tapPromise(name, addHtmlAssets(compilation));
  hooks.normalModuleLoader.tap(name, registerModuleLoaderCallback);
};


/**
 * A webpack plugin for generating HTML assets from templates sent by
 * compatible webpack loaders.
 */
class EntryTransformPlugin {
  apply(compiler) {
    const name = this.constructor.name;
    compiler.hooks.thisCompilation.tap(name, getCompilationHook(name));
  }
}

export default EntryTransformPlugin;
