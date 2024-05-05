import { Schema as S } from "@effect/schema";
import { Brand, Console, Context, Data, Effect, Layer, pipe } from "effect";

type TodoID = Brand.Branded<number, "TodoID">;
type Title = Brand.Branded<string, "Title">;
type Completed = Brand.Branded<boolean, "Completed">;
type UserID = Brand.Branded<number, "UserID">;

const TodoID = Brand.nominal<TodoID>();
const Title = Brand.nominal<Title>();
const Completed = Brand.nominal<Completed>();
const UserID = Brand.nominal<UserID>();

const Todo = S.Struct({
  id: S.Number.pipe(S.brand("TodoID")),
  title: S.String.pipe(S.brand("Title")),
  completed: S.Boolean.pipe(S.brand("Completed")),
  userId: S.Number.pipe(S.brand("UserID")),
});

type Todo = S.Schema.Type<typeof Todo>;

class FetchError extends Data.TaggedError("FetchError")<{}> {}

class DecodeError extends Data.TaggedError("DecodeError")<{}> {}

class TodoRepository extends Context.Tag("TodoRepository")<
  TodoRepository,
  {
    fetchTodoById: (id: TodoID) => Effect.Effect<Todo, DecodeError>;
  }
>() {}

const TodoRepositoryLive = Layer.succeed(TodoRepository, {
  fetchTodoById: (id) =>
    pipe(
      Effect.tryPromise({
        try: () =>
          fetch(`https://jsonplaceholder.typicode.com/todos/${id}`).then(
            (response) => response.json()
          ),
        catch: () => new FetchError(),
      }),
      Effect.flatMap(S.decode(Todo)),
      Effect.mapError(() => new DecodeError())
    ),
});

const fetchFirstTodoProgram = TodoRepository.pipe(
  Effect.provide(TodoRepositoryLive),
  Effect.flatMap((TodoRepository) => TodoRepository.fetchTodoById(TodoID(1))),
  Effect.flatMap((todo) => Console.log(todo)),
  Effect.catchTags({
    DecodeError: () => Console.error("Invalid Todo: Can't decode the todo"),
  })
);

Effect.runPromise(fetchFirstTodoProgram);
