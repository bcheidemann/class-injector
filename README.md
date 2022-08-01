# 💉 class-injector

Crazy simple dependency injection for TypeScript.

## Why?

Dependency injection should be simple - really simple. Most dependency injection libraries for typescript require some combination of excessive boilerplate, manual binding of dependencies and unnecessary type annotations. `class-injector` aims for maximum simplicity with no compromises. This means no boilerplate, no manual binding of dependencies and no unnecessary type annotations. You don't even need to decorate classes to automatically inject them.

## Example

```ts
import { Context, Inject } from "class-injector";

class UserRepository {
  constructor(
    private dbUri: string
  ) {}

  public async getUser(id: string) {
    // --snip--
  }
}

class UserService {
  @Inject() userRepository!: UserRepository;

  public async getUser(id: string) {
    return this.userRepository.getUser(id);
  }
}

class UserController {
  @Inject() userService!: UserService;

  public async getUser(req: any) {
    const id = req.query.id;
    const user = await this.userService.getUser(id);
    return { user };
  }
}

@Context({
  provide: [
    new UserRepository('<uri>'),
  ],
})
class Application {
  @Inject() userController!: UserController;

  // --snip--
}

const app = new Application();
```

## Requirements

It is recommended to set the following options in your `tsconfig`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
  }
}
```

Without these, `class-injector` will not work.

## Testing

When testing, you may want to switch out a dependency for a mock value.

```ts
import { createContext, Inject } from "class-injector";

describe('README Testing Example #1', () => {
  it('should demonstrate mock dependencies', () => {
    const mockDependency: Dependency = {
      fn: jest.fn(),
    };

    class Dependency {
      public fn() {
        fail('Should not be called');
      }
    }

    class Application {
      @Inject() dependency!: Dependency;
    }

    const context = createContext({
      provide: [
        [Dependency, mockDependency],
        new Application(),
      ],
    });

    const app = context.get(Application)!;

    app.dependency.fn();

    expect(mockDependency.fn).toHaveBeenCalled();
  });
});
```
