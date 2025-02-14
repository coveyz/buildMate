export type MaybePromise<T> = T | Promise<T>;

export type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T;