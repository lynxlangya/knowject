type AnyFunction = (...args: unknown[]) => unknown;

export const readRepositoryMethod = <
  Repository extends object,
  Key extends keyof Repository,
>(
  repository: Repository,
  key: Key,
): Extract<Repository[Key], AnyFunction> | null => {
  const candidate = (repository as Repository & Record<Key, Repository[Key]>)[key];

  return typeof candidate === "function"
    ? (candidate as Extract<Repository[Key], AnyFunction>)
    : null;
};

export const callRepositoryMethodWithFallback = async <
  Repository extends object,
  Key extends keyof Repository,
  Result,
>(
  repository: Repository,
  key: Key,
  args: unknown[],
  fallback: () => Promise<Result>,
): Promise<Result> => {
  const method = readRepositoryMethod(repository, key) as
    | ((...methodArgs: unknown[]) => Promise<Result>)
    | null;

  if (method) {
    return method.apply(repository, args);
  }

  return fallback();
};
