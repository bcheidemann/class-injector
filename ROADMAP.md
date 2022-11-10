# Roadmap

## Nested Context (✅)

*Stage: awaiting documentation*

It should be possible to nest contexts. In this case, a dependency should be provided by the nearest
context.

For example:

```ts
class InnerDependency {}
class OuterDependency {}

@Context({
  provide: [
    new InnerDependency()
  ]
})
class InnerContext {
  @Inject() innerDependency!: InnerDependency;
  @Inject() outerDependency!: OuterDependency;
}

@Context({
  provide: [
    new OuterDependency()
  ]
})
class OuterContext {
  @Inject() innerContext!: InnerContext;
}

const app = new OuterContext();

app.innerContext; // The value provided by the InnerContext @Context decorator
app.outerContext; // The value provided by the OuterContext @Context decorator
```

If a dependency needs to be instantiated from its type, it should always be instantiated by the
nearest context.

For example:

```ts
class Dependency {}

@Context()
class InnerContextOne {
  @Inject() dependency!: Dependency;
}

@Context()
class InnerContextTwo {
  @Inject() dependency!: Dependency;
}

@Context()
class OuterContext {
  @Inject() innerContextOne!: InnerContextOne;
  @Inject() innerContextTwo!: InnerContextTwo;
}

const app = new OuterContext();

expect(app.innerContextOne.dependency).not.toBe(app.innerContextTwo.dependency);
```

## Better Documentation

*Stage: research*

Ideally documentation would be generated largely from typescript types and JsDoc comments, with some
hand written docs generated from markdown files.

## Auto-context

*Stage: unstarted*

When a class uses the `@Inject` decorator but is neither decorated with `@Context` nor injected
into a class with a bound context, then it should behave as though it is decorated with `@Context`
with default context options.

## Configurable missing dependency error behaviour

*Stage: unstarted*

Currently, when a dependency is missing from the context and cannot be instantiated from the type,
then an error is thrown when the property getter is invoked. In some cases, it may be preferable
to return `null` instead. Ideally, this behaviour would be customisable via the context options.
It may also be possible to expose a `setDefaultContextOptions` function, or a `createContextDecorator`
function.
