import { Problem, type ErrorCode } from '@senzo/schemas';

export type ApiClientConfig = {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
};

let config: ApiClientConfig = { baseUrl: '' };

export function configureApiClient(next: ApiClientConfig) {
  config = next;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem | undefined,
  ) {
    super(problem?.detail ?? problem?.title ?? `HTTP ${status}`);
  }

  get code(): ErrorCode | undefined {
    return this.problem?.code;
  }
}

/** orval mutator: every generated call goes through here. */
export async function senzoFetch<T>(url: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  const token = await config.getAccessToken?.();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(config.baseUrl + url, { ...init, headers });
  const text = res.status === 204 ? '' : await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const parsed = Problem.safeParse(data);
    throw new ApiError(res.status, parsed.success ? parsed.data : undefined);
  }
  return data as T;
}
