/**
 * This file should only contain code snippets from the README.md file.
 */

import { createContext, Inject } from '..'

describe('README Testing Example #1', () => {
  it('should demonstrate mock dependencies', () => {
    const mockDependency: Dependency = {
      fn: jest.fn(),
    }

    class Dependency {
      public fn() {
        fail('Should not be called')
      }
    }

    class Application {
      @Inject() dependency!: Dependency
    }

    const context = createContext({
      provide: [[Dependency, mockDependency], new Application()],
    })

    const app = context.get<Application>(Application)!

    app.dependency.fn()

    expect(mockDependency.fn).toHaveBeenCalled()
  })
})
