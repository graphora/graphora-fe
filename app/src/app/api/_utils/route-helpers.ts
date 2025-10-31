export type RouteParamsInput<T extends Record<string, string>> = T | Promise<T> | undefined

export async function resolveRouteParams<T extends Record<string, string>>(input: RouteParamsInput<T>): Promise<T> {
  if (!input) {
    throw new Error('Missing route params')
  }

  if (typeof (input as Promise<T>).then === 'function') {
    return await (input as Promise<T>)
  }

  return input as T
}
