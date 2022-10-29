import 'reflect-metadata';

const ContextSymbol = Symbol.for('@@class-injector-context@@');

type Symbol = any;
type Type = any;
type Instance = any;

type ContextOptions = {
  provide?: ([Type, Instance] | Instance)[],
}

type Context = Omit<Map<Type, Instance>, "get"> & {
  get<T>(key: new (...params: any[]) => T): T | undefined;
}

const SymbolRegistry = new Map<Symbol, Type>();

export function createContext(options: ContextOptions): Context {
  // Create a new context
  const context = new Map<Type, Instance>();

  // Provide the context to the constructor
  const provide = options.provide || [];
  for (const dependency of provide) {
    let type: Type;
    let instance: Instance;

    if (Array.isArray(dependency)) {
      type = dependency[0];
      instance = dependency[1];
    }
    else {
      type = dependency.constructor;
      instance = dependency;
    }

    // Add the instance to the context
    context.set(type, instance);

    // Add the context to the instance
    Object.defineProperty(instance, ContextSymbol, {
      value: context,
    });
  }

  return context;
}

export const Context = (options: ContextOptions = {}): ClassDecorator => (target: Type) => {
  // Set the context on the constructor prototype
  target.prototype[ContextSymbol] = createContext(options);
}

export const Inject = (type?: any): PropertyDecorator => (target: Instance, propertyKey: string | symbol) => {
  // Get the type of the dependency to inject
  const _type =
    (type === undefined)
      ? Reflect.getMetadata("design:type", target, propertyKey)
      : type;

  // Lazy bind the dependency to the instance via a getter
  Object.defineProperty(target, propertyKey, {
    get() {
      // Get the context
      const context = this[ContextSymbol];
      if (!context) {
        throw new Error('Context not initialized. You may be attempting to access a dependency in the constructor or you may have instantiated a class not decorated with @Context().');
      }

      // Try to get the instance from the context
      let instance = this[ContextSymbol].get(_type);

      // Get the type from the symbol registry
      if (!instance) {
        const type = SymbolRegistry.get(_type);

        if (type) {
          instance = new type();

          context.set(_type, instance);

          // Add the context to the instance
          Object.defineProperty(instance, ContextSymbol, {
            value: context,
          });
        }
      }

      // Instantiate the dependency and add it to the context if it's not already in the context
      if (!instance) {
        // Ensure the dependency can be instantiated as a constructor type
        if (typeof _type !== 'function') {
          throw new Error('Cannot instantiate a symbol type. Please use a class type instead or provide an instance for the type in the context.');
        }

        instance = new _type();

        // Add the instance to the context
        context.set(_type, instance);

        // Add the context to the instance
        Object.defineProperty(instance, ContextSymbol, {
          value: context,
        });
      }

      return instance;
    },
  });
}

export const Provide = (symbol?: any): ClassDecorator => (target: Type) => {
  SymbolRegistry.set(symbol, target);
}
