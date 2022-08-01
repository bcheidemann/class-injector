import 'reflect-metadata';

const ContextSymbol = Symbol.for('@@class-injector-context@@');

type Constructor = any;
type Instance = any;

type ContextOptions = {
  provide?: ([Constructor, Instance] | Instance)[],
}

type Context = Omit<Map<Constructor, Instance>, "get"> & {
  get<T>(key: new (...params: any[]) => T): T | undefined;
}

export function createContext(options: ContextOptions): Context {
  // Create a new context
  const context = new Map<Constructor, Instance>();

  // Provide the context to the constructor
  const provide = options.provide || [];
  for (const dependency of provide) {
    let type: Constructor;
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

export const Context = (options: ContextOptions = {}): ClassDecorator => (target: Constructor) => {
  // Set the context on the constructor prototype
  target.prototype[ContextSymbol] = createContext(options);
}

export const Inject = (): PropertyDecorator => (target: Instance, propertyKey: string | symbol) => {
  // Get the type of the dependency to inject
  const type = Reflect.getMetadata("design:type", target, propertyKey);

  // Lazy bind the dependency to the instance via a getter
  Object.defineProperty(target, propertyKey, {
    get() {
      // Get the context
      const context = this[ContextSymbol];
      if (!context) {
        throw new Error('Context not initialized. You may be attempting to access a dependency in the constructor or you may have instantiated a class not decorated with @Context().');
      }

      // Get the instance from the context
      let instance = this[ContextSymbol].get(type);

      // Instantiate the dependency and add it to the context if it's not already in the context
      if (!instance) {
        instance = new type();

        // Add the instance to the context
        context.set(type, instance);

        // Add the context to the instance
        Object.defineProperty(instance, ContextSymbol, {
          value: context,
        });
      }

      return instance;
    },
  });
}
