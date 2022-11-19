import 'reflect-metadata'

export const __ContextSymbol = Symbol.for('@@class-injector-context@@')

type Symbol = any
type Type = any
type Instance = any
type Constructor<T> = {
  new (...args: any[]): T
}

export type ContextOptions = {
  provide?: ([Type, Instance] | Instance)[]
}

export type PartialContext = {
  get<Instance>(type: Type): Instance | null
  set(type: Type, instance: Instance): void
  has(type: Type): boolean
}

export type Context = PartialContext & {
  bind: (instance: Instance) => void
  instantiate: <T>(type: Constructor<T>) => T
}

class PartialContextImpl
  extends Map<Type, Instance>
  implements PartialContext {}

class ContextImpl implements Context {
  public contextPartials: PartialContext[] = []

  public get<Instance>(type: Type): Instance | null {
    for (const partial of this.contextPartials) {
      if (partial.has(type)) {
        return partial.get(type)
      }
    }

    return null
  }

  public set(type: Type, instance: Instance): void {
    if (this.contextPartials.length === 0) {
      throw new Error(
        [
          'Failed to set an instance in the context because no context partials are bound to the context.',
          'Unless you are manipulating the context directly, this is a bug.',
          'Please report this issue at https://github.com/bcheidemann/class-injector/issues/new',
        ].join('\n')
      )
    }

    this.contextPartials[0].set(type, instance)
  }

  public has(type: Type): boolean {
    return this.contextPartials.some((partial) => partial.has(type))
  }

  public instantiate<Instance>(type: Constructor<Instance>): Instance {
    let instance = this.get<Instance>(type)

    if (!instance) {
      // Get existing context if one exists
      const existingContext = type.prototype[__ContextSymbol] as ContextImpl

      if (existingContext) {
        // Extend the existing context
        existingContext.contextPartials.push(...this.contextPartials)

        // Instantiate the type.
        instance = new type()

        // Remove the context partials we added
        existingContext.contextPartials.splice(
          existingContext.contextPartials.length - this.contextPartials.length,
          this.contextPartials.length
        )
      } else {
        // Bind the context to the types prototype
        type.prototype[__ContextSymbol] = this

        // Instantiate the type.
        instance = new type()

        // Unbind the prototype from the context.
        type.prototype[__ContextSymbol] = undefined
      }

      // Bind the instance to the context.
      this.bind(instance)

      // Store the instance in the context.
      this.set(type, instance)
    }

    return instance
  }

  public bind(instance: Instance) {
    if (typeof instance !== 'object') {
      return
    }

    const existingContext = instance[__ContextSymbol] as ContextImpl

    if (existingContext) {
      // Extend the existing context
      existingContext.contextPartials.push(...this.contextPartials)

      return
    }

    // Bind this context to the instance
    Object.defineProperty(instance, __ContextSymbol, {
      value: this,
    })
  }
}

export const __TypeRegistry = new Map<Symbol, Type>()
export const __InstanceRegistry = new Map<Symbol, Instance>()

export function createPartialForContext(
  context: Context,
  options: ContextOptions = {}
): PartialContext {
  // Create a new context
  const partial = new PartialContextImpl()

  // Provide the context to the constructor
  const provide = options.provide || []
  for (const dependency of provide) {
    let type: Type
    let instance: Instance

    if (Array.isArray(dependency)) {
      type = dependency[0]
      instance = dependency[1]
    } else {
      type = dependency.constructor
      instance = dependency
    }

    // Add the instance to the context
    partial.set(type, instance)

    // Add the context to the instance
    if (typeof instance === 'object') {
      Object.defineProperty(instance, __ContextSymbol, {
        value: context,
      })
    }
  }

  return partial
}

export function createContext(options: ContextOptions = {}): Context {
  // Create a new context context
  const context = new ContextImpl()

  // Create a new context
  const partial = createPartialForContext(context, options)

  // Bind the context to the context
  context.contextPartials.unshift(partial)

  return context
}

export const Context =
  (options: ContextOptions = {}): ClassDecorator =>
  (target: any) => {
    // Get the context context from the target if it exists
    let context: ContextImpl | undefined = target.prototype[__ContextSymbol]

    // Create a new context context if it doesn't exist and bind it to the target
    if (!context) {
      context = new ContextImpl()

      target.prototype[__ContextSymbol] = context
    }

    // Create a new context partial
    const partial = createPartialForContext(context, options)

    // Bind the context partial to the context
    context.contextPartials.unshift(partial)
  }

export const Inject =
  (type?: any): PropertyDecorator =>
  (target: Instance, propertyKey: string | symbol) => {
    // Get the type of the dependency to inject
    const _type =
      type === undefined
        ? Reflect.getMetadata('design:type', target, propertyKey)
        : type

    // Lazy bind the dependency to the instance via a getter
    Object.defineProperty(target, propertyKey, {
      get() {
        // Get the context
        let context = this[__ContextSymbol] as Context | undefined
        if (!context) {
          this[__ContextSymbol] = context = createContext()
        }

        // Return the context if the @Inject(Context) pattern is used
        if (_type === Context) {
          return context
        }

        // Try to get the instance from the context
        if (context.has(_type)) {
          return this[__ContextSymbol].get(_type)
        }

        // Get the type from the symbol registry
        if (__InstanceRegistry.has(_type)) {
          const instance = __InstanceRegistry.get(_type)

          context.set(_type, instance)

          // NOTE: The instance is not bound to the context since it could be reused across many
          // contexts ProvideInstance and provideInstance should not be used if the instance requires
          // access to the parent context. Provide and provide should be used instead, as these will
          // create a new instance for each context and bind the context to that instance.

          return instance
        }

        if (__TypeRegistry.has(_type)) {
          const type = __TypeRegistry.get(_type)

          return context.instantiate(type)
        }

        // Ensure the dependency can be instantiated as a constructor type
        if (typeof _type !== 'function') {
          throw new Error(
            'Cannot instantiate a symbol type. Please use a class type instead or provide an instance for the type in the context.'
          )
        }

        return context.instantiate(_type)
      },
    })
  }

export const Provide =
  (symbol?: any): ClassDecorator =>
  (target: Type) => {
    const _symbol = symbol === undefined ? target : symbol

    __TypeRegistry.set(_symbol, target)
  }

export function provide(symbol: Symbol, type: Type): void
export function provide(type: Type): void
export function provide(symbolOrType: any, type?: Type): void {
  const _type = type === undefined ? symbolOrType : type

  __TypeRegistry.set(symbolOrType, _type)
}

export const ProvideInstance =
  (symbol?: any): ClassDecorator =>
  (target: Type) => {
    const instance = new target()

    __InstanceRegistry.set(symbol, instance)
  }

export function provideInstance<T>(
  symbol: Symbol,
  constructor: Constructor<T>
): T
export function provideInstance<T>(instance: Constructor<T>): T
export function provideInstance<T>(
  symbolOrConstructor: any,
  constructor?: Constructor<T>
): T {
  const _constructor =
    constructor === undefined ? symbolOrConstructor : constructor

  const instance = new _constructor()

  __InstanceRegistry.set(symbolOrConstructor, instance)

  return instance
}

export function provideRawInstance<T extends Instance>(
  symbol: Symbol,
  instance: T
): T
export function provideRawInstance<T extends Instance>(instance: T): T
export function provideRawInstance<T extends Instance>(
  symbolOrInstance: any,
  instance?: T
): T {
  const _symbol =
    instance === undefined ? symbolOrInstance.constructor : symbolOrInstance
  const _instance = instance === undefined ? symbolOrInstance : instance

  __InstanceRegistry.set(_symbol, _instance)

  return _instance
}

export const getContext = (instance: Instance): Context | null => {
  return instance[__ContextSymbol]
}

export const isContext = (instance: any): instance is Context => {
  return instance instanceof ContextImpl
}
