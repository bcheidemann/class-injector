import { Context, createContext, Inject } from '..';

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
      ]
    })
    class Application {
      @Inject()
      public dependency!: Dependency;
    }

    const app = new Application();

    app.dependency.fn();

    expect(mock.fn).toHaveBeenCalled();
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
      ]
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
});
