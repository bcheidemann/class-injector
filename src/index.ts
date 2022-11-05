import 'reflect-metadata';

const ContextSymbol = Symbol.for('@@class-injector-context@@');

type Symbol = any;
type Type = any;
type Instance = any;
type Constructor<T> = {
  new (...args: any[]): T;
}

type ContextOptions = {
  provide?: ([Type, Instance] | Instance)[],
}

export type Context = Map<Type, Instance> & {
  bind: (instance: Instance) => void;
  instantiate: <T>(type: Constructor<T>) => T;
};

class ContextImpl extends Map<Type, Instance> implements Context {
  public bind(instance: Instance) {
    if (typeof instance !== 'object') {
      return;
    }

    Object.defineProperty(instance, ContextSymbol, {
      value: this,
    });
  }

  public instantiate<T>(type: Constructor<T>) {
    let instance = this.get(type);

    if (!instance) {
      instance = new type();

      this.set(type, instance);
      this.bind(instance);
    }

    return instance;
  }
}

export const __TypeRegistry = new Map<Symbol, Type>();
export const __InstanceRegistry = new Map<Symbol, Instance>();

export function createContext(options: ContextOptions = {}): Context {
  // Create a new context
  const context = new ContextImpl();

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
    if (typeof instance === 'object') {
      Object.defineProperty(instance, ContextSymbol, {
        value: context,
      });
    }
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

      // Return the context if the @Inject(Context) pattern is used
      if (_type === Context) {
        return context;
      }

      // Try to get the instance from the context
      if (context.has(_type)) {
        return this[ContextSymbol].get(_type);
      }

      // Get the type from the symbol registry
      if (__InstanceRegistry.has(_type)) {
        const instance = __InstanceRegistry.get(_type);

        context.set(_type, instance);

        // NOTE: The instance is not bound to the context since it could be reused across many 
        // contexts ProvideInstance and provideInstance should not be used if the instance requires
        // access to the parent context. Provide and provide should be used instead, as these will
        // create a new instance for each context and bind the context to that instance.

        return instance;
      }

      if (__TypeRegistry.has(_type)) {
        const type = __TypeRegistry.get(_type);

        const instance = new type();

        context.set(_type, instance);
        context.bind(instance);

        return instance;
      }

      // Ensure the dependency can be instantiated as a constructor type
      if (typeof _type !== 'function') {
        throw new Error('Cannot instantiate a symbol type. Please use a class type instead or provide an instance for the type in the context.');
      }

      const instance = new _type();

      // Add the instance to the context
      context.set(_type, instance);
      context.bind(instance);

      return instance;
    },
  });
}

export const Provide = (symbol?: any): ClassDecorator => (target: Type) => {
  const _symbol = symbol === undefined ? target : symbol;

  __TypeRegistry.set(_symbol, target);
}

export const provide = (symbol: Symbol, type: Type) => {
  __TypeRegistry.set(symbol, type);
}

export const ProvideInstance = (symbol?: any): ClassDecorator => (target: Type) => {
  const instance = new target();

  __InstanceRegistry.set(symbol, instance);
}

export const provideInstance = <T>(symbol: Symbol, constructor: Constructor<T>): T => {
  const instance = new constructor();

  __InstanceRegistry.set(symbol, instance);

  return instance;
}

export const provideRawInstance = <T extends Instance>(symbol: Symbol, instance: T): T => {
  __InstanceRegistry.set(symbol, instance);

  return instance;
}

export const getContext = (instance: Instance): Context | null => {
  return instance[ContextSymbol];
}
