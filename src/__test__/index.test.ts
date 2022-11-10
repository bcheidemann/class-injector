import { createContext, getContext, Inject, provide, Provide, ProvideInstance, provideInstance, provideRawInstance, __InstanceRegistry, __TypeRegistry, Context } from '..';

describe('index', () => {
  it('Should automatically inject dependencies', () => {
    const fn = jest.fn();

    class Dependency {
      public fn = fn;
    }

    @Context()
    class Application {
      @Inject()
      public dependency!: Dependency;
    }

    const app = new Application();

    app.dependency.fn();

    expect(fn).toHaveBeenCalled();
  });

  it('Should automatically inject nested dependencies', () => {
    const fn = jest.fn();

    class DeepDependency {
      public fn = fn;
    }

    class ShallowDependency {
      @Inject() deepDependency!: DeepDependency;
    }

    @Context()
    class Application {
      @Inject()
      public shallowDependency!: ShallowDependency;
    }

    const app = new Application();

    app.shallowDependency.deepDependency.fn();

    expect(fn).toHaveBeenCalled();
  });

  it('Should provide a mock instance', () => {
    const mock: Dependency = {
      fn: jest.fn(),
    };

    class Dependency {
      public fn: Function = () => fail('Should not be called');
    }

    @Context({
      provide: [
        [Dependency, mock],
      ],
    })
    class Application {
      @Inject()
      public dependency!: Dependency;
    }

    const app = new Application();

    app.dependency.fn();

    expect(mock.fn).toHaveBeenCalled();
  });

  it('Should provide an instance by symbol type using the context provide option', () => {
    enum Dependencies {
      Dependency,
    }

    class Dependency {
      public key = 'value';
    }

    @Context({
      provide: [
        [Dependencies.Dependency, new Dependency()],
      ],
    })
    class Application {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string };
    }

    const app = new Application();

    expect(app.dependency.key).toBe('value');
  });

  it('Should provide an instance by symbol type using the Provide decorator', () => {
    enum Dependencies {
      Dependency,
    }

    @Provide(Dependencies.Dependency)
    class Dependency {
      public key = 'value';
    }

    @Context()
    class Application {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string };
    }

    const app = new Application();

    expect(app.dependency.key).toBe('value');
  });


  it('Should provide the type in the type registry when using Provide decorator', () => {
    @Provide()
    class Dependency {}

    const hasDependency = __TypeRegistry.has(Dependency);

    expect(hasDependency).toBe(true);
  });


  it('Should create a unique instance for each context when using the Provide decorator', () => {
    enum Dependencies {
      Dependency,
    }

    @Provide(Dependencies.Dependency)
    class Dependency {
      @Inject(Context) context!: Context;

      public key = 'value';
    }

    @Context()
    class ApplicationOne {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: Context };
    }

    @Context()
    class ApplicationTwo {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: Context };
    }

    const appOne = new ApplicationOne();
    const appTwo = new ApplicationTwo();

    expect(appOne.dependency).toBeInstanceOf(Dependency);
    expect(appTwo.dependency).toBeInstanceOf(Dependency);

    expect(appOne.dependency).not.toBe(appTwo.dependency);
    expect(appOne.dependency.context).not.toBe(appTwo.dependency.context);

    expect(appOne.dependency.context).toBe(getContext(appOne));
    expect(appTwo.dependency.context).toBe(getContext(appTwo));
  });

  it('Should set the type in the type registry when using the provide function', () => {
    class Dependency {}

    provide(Dependency);

    const type = __TypeRegistry.get(Dependency);

    expect(type).toBe(Dependency);
  });

  it('Should create a unique instance for each context when using the provide function', () => {
    enum Dependencies {
      Dependency,
    }

    class Dependency {
      @Inject(Context) context!: Context;

      public key = 'value';
    }

    provide(Dependencies.Dependency, Dependency);

    @Context()
    class ApplicationOne {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: Context };
    }

    @Context()
    class ApplicationTwo {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: Context };
    }

    const appOne = new ApplicationOne();
    const appTwo = new ApplicationTwo();

    expect(appOne.dependency).toBeInstanceOf(Dependency);
    expect(appTwo.dependency).toBeInstanceOf(Dependency);

    expect(appOne.dependency).not.toBe(appTwo.dependency);
    expect(appOne.dependency.context).not.toBe(appTwo.dependency.context);

    expect(appOne.dependency.context).toBe(getContext(appOne));
    expect(appTwo.dependency.context).toBe(getContext(appTwo));
  });

  it('Should provide an instance with the ProvideInstance decorator', () => {
    enum Dependencies {
      Dependency,
    }

    @ProvideInstance(Dependencies.Dependency)
    class Dependency {
      @Inject(Context) context: any;

      public key = 'value';
    }

    @Context()
    class ApplicationOne {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: any };
    }

    @Context()
    class ApplicationTwo {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: any };
    }

    const appOne = new ApplicationOne();
    const appTwo = new ApplicationTwo();

    expect(appOne.dependency).toBeInstanceOf(Dependency);
    expect(appTwo.dependency).toBeInstanceOf(Dependency);

    expect(appOne.dependency).toBe(appTwo.dependency);

    expect(() => appOne.dependency.context).toThrowError('Context not initialized. You may be attempting to access a dependency in the constructor or you may have instantiated a class not decorated with @Context().');
    expect(() => appTwo.dependency.context).toThrowError('Context not initialized. You may be attempting to access a dependency in the constructor or you may have instantiated a class not decorated with @Context().');
  });

  it('Should set the instance in the instance registry when using the provide function', () => {
    class Dependency {}

    const providedInstance = provideInstance(Dependency);

    const instance = __InstanceRegistry.get(Dependency);

    expect(instance).toBeInstanceOf(Dependency);
    expect(instance).toBe(providedInstance);
  });

  it('Should provide the same instance for different contexts with the provideInstance function', () => {
    enum Dependencies {
      Dependency,
    }

    class Dependency {
      @Inject(Context) context: any;

      public key = 'value';
    }

    const instance = provideInstance(Dependencies.Dependency, Dependency);

    @Context()
    class ApplicationOne {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: any };
    }

    @Context()
    class ApplicationTwo {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: any };
    }

    const appOne = new ApplicationOne();
    const appTwo = new ApplicationTwo();

    expect(appOne.dependency).toBe(instance);
    expect(appTwo.dependency).toBe(instance);

    expect(appOne.dependency).toBeInstanceOf(Dependency);
    expect(appTwo.dependency).toBeInstanceOf(Dependency);

    expect(appOne.dependency).toBe(appTwo.dependency);

    expect(() => appOne.dependency.context).toThrowError('Context not initialized. You may be attempting to access a dependency in the constructor or you may have instantiated a class not decorated with @Context().');
    expect(() => appTwo.dependency.context).toThrowError('Context not initialized. You may be attempting to access a dependency in the constructor or you may have instantiated a class not decorated with @Context().');
  });

  it('Should provide a raw instance with the provideInstance function', () => {
    class Dependency {
      @Inject(Context) context: any;
    }

    const instance = provideRawInstance(new Dependency());

    @Context()
    class Application {
      @Inject()
      public dependency!: Dependency;
    }

    const app = new Application();

    expect(app.dependency).toBe(instance);
    expect(app.dependency).toBeInstanceOf(Dependency);

    expect(() => app.dependency.context).toThrowError('Context not initialized. You may be attempting to access a dependency in the constructor or you may have instantiated a class not decorated with @Context().');
  });

  it('Should provide the same raw instance in different contexts with the provideInstance function', () => {
    enum Dependencies {
      Dependency,
    }

    class Dependency {
      @Inject(Context) context: any;

      public key = 'value';
    }

    const instance = provideRawInstance(Dependencies.Dependency, new Dependency());

    @Context()
    class ApplicationOne {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: any };
    }

    @Context()
    class ApplicationTwo {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string, context: any };
    }

    const appOne = new ApplicationOne();
    const appTwo = new ApplicationTwo();

    expect(appOne.dependency).toBe(instance);
    expect(appTwo.dependency).toBe(instance);

    expect(appOne.dependency).toBeInstanceOf(Dependency);
    expect(appTwo.dependency).toBeInstanceOf(Dependency);

    expect(appOne.dependency).toBe(appTwo.dependency);

    expect(() => appOne.dependency.context).toThrowError('Context not initialized. You may be attempting to access a dependency in the constructor or you may have instantiated a class not decorated with @Context().');
    expect(() => appTwo.dependency.context).toThrowError('Context not initialized. You may be attempting to access a dependency in the constructor or you may have instantiated a class not decorated with @Context().');
  });

  it('Provided classes should share the same context', () => {
    class Common {}

    class Dependency {
      @Inject()
      public common!: Common;
    }

    @Context({
      provide: [
        new Dependency(),
      ],
    })
    class Application {
      @Inject()
      public dependency!: Dependency;

      @Inject()
      public common!: Common;
    }

    const app = new Application();

    expect(app.common).toBeInstanceOf(Common);
    expect(app.dependency.common).toBeInstanceOf(Common);
    expect(app.common).toBe(app.dependency.common);
  });

  it('Should provide an instance', () => {
    const fn = jest.fn();

    class Dependency {
      constructor(
        private callback: () => void,
      ) {}

      public fn() {
        this.callback();
      }
    }

    @Context({
      provide: [
        new Dependency(fn),
      ],
    })
    class Application {
      @Inject()
      public dependency!: Dependency;
    }

    const app = new Application();

    app.dependency.fn();

    expect(fn).toHaveBeenCalled();
  });

  it('Should throw a descriptive error if a class is instantiated which uses @Inject() without @Context()', () => {
    class Dependency {}

    class Application {
      @Inject()
      public shallowDependency!: Dependency;

      constructor() {
        this.shallowDependency;
      }
    }

    expect(() => new Application()).toThrowErrorMatchingSnapshot();
  });

  it('Should allow multiple contexts to for different classes', () => {
    abstract class Dependency {
      public abstract fn(context: 'one' | 'two'): void;
    }

    class DependencyOne extends Dependency {
      static fn = jest.fn();
      public fn = DependencyOne.fn;
    }

    class DependencyTwo extends Dependency {
      static fn = jest.fn();
      public fn = DependencyTwo.fn;
    }

    @Context({
      provide: [
        [Dependency, new DependencyOne()],
      ],
    })
    class ApplicationOne {
      @Inject()
      public dependency!: Dependency;
    }

    @Context({
      provide: [
        [Dependency, new DependencyTwo()],
      ],
    })
    class ApplicationTwo {
      @Inject()
      public dependency!: Dependency;
    }

    const appOne = new ApplicationOne();
    const appTwo = new ApplicationTwo();

    appOne!.dependency.fn('one');
    appTwo!.dependency.fn('two');

    expect(DependencyOne.fn).toHaveBeenCalledTimes(1);
    expect(DependencyOne.fn).toHaveBeenCalledWith('one');

    expect(DependencyTwo.fn).toHaveBeenCalledTimes(1);
    expect(DependencyTwo.fn).toHaveBeenCalledWith('two');
  });

  it('Dependencies should be automatically injected when calling createContext', () => {
    const fn = jest.fn();

    class Dependency {
      public fn = fn;
    }

    class Application {
      @Inject()
      public dependency!: Dependency;
    }

    const context = createContext({
      provide: [
        new Application(),
      ],
    });

    const app = context.get<Application>(Application);

    app!.dependency.fn();

    expect(fn).toHaveBeenCalled();
  });

  it('Should allow multiple contexts to exist', () => {
    abstract class Dependency {
      public abstract fn(context: 'one' | 'two'): void;
    }

    class DependencyOne extends Dependency {
      static fn = jest.fn();
      public fn = DependencyOne.fn;
    }

    class DependencyTwo extends Dependency {
      static fn = jest.fn();
      public fn = DependencyTwo.fn;
    }

    class Application {
      @Inject()
      public dependency!: Dependency;
    }

    const contextOne = createContext({
      provide: [
        [Dependency, new DependencyOne()],
        new Application(),
      ],
    });

    const contextTwo = createContext({
      provide: [
        [Dependency, new DependencyTwo()],
        new Application(),
      ],
    });

    const appOne = contextOne.get<Application>(Application);
    const appTwo = contextTwo.get<Application>(Application);

    appOne!.dependency.fn('one');
    appTwo!.dependency.fn('two');

    expect(DependencyOne.fn).toHaveBeenCalledTimes(1);
    expect(DependencyOne.fn).toHaveBeenCalledWith('one');

    expect(DependencyTwo.fn).toHaveBeenCalledTimes(1);
    expect(DependencyTwo.fn).toHaveBeenCalledWith('two');
  });

  it('Should allow providing arbitrary instance types', () => {
    @Context({
      provide: [
        ['key', 'value']
      ]
    })
    class Application {
      @Inject('key')
      key!: string;
    }

    const app = new Application();

    expect(app.key).toBe('value');
  });

  it('Should allow context injection', () => {
    @Context({
      provide: [
        ['key', 'value']
      ]
    })
    class Application {
      @Inject(Context)
      context!: Context;
    }

    const app = new Application();

    const key = app.context.get('key');

    expect(key).toBe('value');
  });

  it('Should bind the context to a manually instantiated instance', () => {
    class Dependency {
      public key = 'value';
    }

    class RuntimeDependency {
      @Inject() dependency!: Dependency;
    }

    @Context()
    class Application {
      @Inject(Context)
      context!: Context;

      public getRuntimeDependency() {
        const runtimeDependency = new RuntimeDependency();

        this.context.bind(runtimeDependency);

        return runtimeDependency;
      }
    }

    const app = new Application();

    const runtimeDependency = app.getRuntimeDependency();

    expect(runtimeDependency.dependency.key).toBe('value');
  });

  it('Should instantiate a type at runtime', () => {
    class Dependency {
      public key = 'value';
    }

    class RuntimeDependency {
      @Inject() dependency!: Dependency;
    }

    @Context()
    class Application {
      @Inject(Context)
      context!: Context;

      public getRuntimeDependency() {
        return this.context.instantiate(RuntimeDependency);
      }
    }

    const app = new Application();

    const runtimeDependency = app.getRuntimeDependency();

    expect(runtimeDependency.dependency.key).toBe('value');
  });

  it('Should dedupe a runtime instantiated type', () => {
    class RuntimeDependency {}

    @Context()
    class Application {
      @Inject(Context)
      context!: Context;

      public getRuntimeDependency() {
        return this.context.instantiate(RuntimeDependency);
      }
    }

    const app = new Application();

    const runtimeDependencyOne = app.getRuntimeDependency();
    const runtimeDependencyTwo = app.getRuntimeDependency();

    expect(runtimeDependencyOne).toBeInstanceOf(RuntimeDependency);
    expect(runtimeDependencyTwo).toBeInstanceOf(RuntimeDependency);
    expect(runtimeDependencyOne).toBe(runtimeDependencyTwo);
  });

  it('Should get the context from an instance', () => {
    const context = createContext();

    class Application {}

    const app = context.instantiate(Application);
    const appContext = getContext(app);

    expect(appContext).toBe(context);
  });

  it('Should get the context from an this', () => {
    const context = createContext();

    class Application {
      public getContext() {
        return getContext(this);
      }
    }

    const app = context.instantiate(Application);
    const appContext = app.getContext();

    expect(appContext).toBe(context);
  });

  it('Should allow using injected properties in the constructor', () => {
    class Dependency {}

    @Context()
    class Application {
      @Inject() dependency!: Dependency;

      constructor() {
        expect(this.dependency).toBeInstanceOf(Dependency);
      }
    }

    new Application();
  });

  it('Dependencies should be able to access properties in the constructor', () => {
    class NestedDependency {}

    class Dependency {
      @Inject() dependency!: NestedDependency;

      constructor() {
        expect(this.dependency).toBeInstanceOf(NestedDependency);
      }
    }

    @Context()
    class Application {
      @Inject() dependency!: Dependency;

      constructor() {
        expect(this.dependency.dependency).toBeInstanceOf(NestedDependency);
      }
    }

    new Application();
  });

  it('Dependencies provided globally with the provide funtion should be able to access properties in the constructor', () => {
    class NestedDependency {}

    class Dependency {
      @Inject() dependency!: NestedDependency;

      constructor() {
        expect(this.dependency).toBeInstanceOf(NestedDependency);
      }
    }
    provide('Dependency', Dependency)

    @Context()
    class Application {
      @Inject('Dependency') dependency: any;

      constructor() {
        expect(this.dependency.dependency).toBeInstanceOf(NestedDependency);
      }
    }

    new Application();
  });

  it('Should have access to nested contexts using the Inject decorator in nested context', () => {
    class DependencyOne {}

    const dependencyOne = new DependencyOne();

    class DependencyTwo {}

    const dependencyTwo = new DependencyTwo();

    @Context({
      provide: [dependencyTwo]
    })
    class Application {
      @Inject() dependencyOne!: DependencyOne;
      @Inject() dependencyTwo!: DependencyTwo;
    }

    @Context({
      provide: [dependencyOne]
    })
    class Root {
      @Inject() application!: Application;
    }

    const root = new Root();

    expect(root.application.dependencyOne).toBe(dependencyOne);
    expect(root.application.dependencyTwo).toBe(dependencyTwo);
  });

  it('Should have access to nested contexts using the Inject decorator in dependency', () => {
    class DependencyOne {}

    const dependencyOne = new DependencyOne();

    class DependencyTwo {}

    const dependencyTwo = new DependencyTwo();

    class Service {
      @Inject() dependencyOne!: DependencyOne;
      @Inject() dependencyTwo!: DependencyTwo;
    }

    @Context({
      provide: [dependencyTwo]
    })
    class Application {
      @Inject() service!: Service;
    }

    @Context({
      provide: [dependencyOne]
    })
    class Root {
      @Inject() application!: Application;
    }

    const root = new Root();

    expect(root.application.service.dependencyOne).toBe(dependencyOne);
    expect(root.application.service.dependencyTwo).toBe(dependencyTwo);
  });

  it('Should have access to nested contexts when extending a class decorated with Context', () => {
    class DependencyOne {}

    const dependencyOne = new DependencyOne();

    class DependencyTwo {}

    const dependencyTwo = new DependencyTwo();

    @Context({
      provide: [dependencyTwo]
    })
    class BaseApplication {}

    @Context({
      provide: [dependencyOne]
    })
    class Application extends BaseApplication {
      @Inject() dependencyOne!: DependencyOne;
      @Inject() dependencyTwo!: DependencyTwo;
    }

    const app = new Application();

    expect(app.dependencyOne).toBe(dependencyOne);
    expect(app.dependencyTwo).toBe(dependencyTwo);
  });

  it('Should be able to decorate a class with multiple contexts', () => {
    class DependencyOne {}

    const dependencyOne = new DependencyOne();

    class DependencyTwo {}

    const dependencyTwo = new DependencyTwo();

    @Context({
      provide: [dependencyTwo]
    })
    @Context({
      provide: [dependencyOne]
    })
    class Application {
      @Inject() dependencyOne!: DependencyOne;
      @Inject() dependencyTwo!: DependencyTwo;
    }

    const app = new Application();

    expect(app.dependencyOne).toBe(dependencyOne);
    expect(app.dependencyTwo).toBe(dependencyTwo);
  });

  it('Should log an appropriate error when setting a type on a context but no context partials are bound to the context', () => {
    const context = createContext();

    Object.defineProperty(context, 'contextPartials', {
      value: []
    });

    expect(() => context.set('test', 'test')).toThrowErrorMatchingSnapshot();
  });
});
