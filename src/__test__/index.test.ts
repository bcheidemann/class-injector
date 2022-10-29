import { Context, createContext, Inject, Provide } from '..';

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


  it('Should create a unique instance for each context when using the Provide decorator', () => {
    enum Dependencies {
      Dependency,
    }

    @Provide(Dependencies.Dependency)
    class Dependency {
      public key = 'value';
    }

    @Context()
    class ApplicationOne {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string };
    }

    @Context()
    class ApplicationTwo {
      @Inject(Dependencies.Dependency)
      public dependency!: { key: string };
    }

    const appOne = new ApplicationOne();
    const appTwo = new ApplicationTwo();

    expect(appOne.dependency).toBeInstanceOf(Dependency);
    expect(appTwo.dependency).toBeInstanceOf(Dependency);

    expect(appOne.dependency).not.toBe(appTwo.dependency);
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

  it('Should throw a descriptive error if a dependency is accessed in the constructor', () => {
    class DeepDependency {}

    class ShallowDependency {
      @Inject() deepDependency!: DeepDependency;

      constructor() {
        this.deepDependency;
      }
    }

    @Context()
    class Application {
      @Inject()
      public shallowDependency!: ShallowDependency;

      constructor() {
        this.shallowDependency;
      }
    }

    expect(() => new Application()).toThrowErrorMatchingSnapshot();
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

    const app = context.get(Application);

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

    const appOne = contextOne.get(Application);
    const appTwo = contextTwo.get(Application);

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
});
