import axios from 'axios';
import memoize from 'memoizee';

type ResponsePayload = {
    fanOn: boolean,
    fanSpeed: number,
    fanDirection: 'forward' | 'reverse',
    lightOn: boolean,
    lightBrightness: number
}

type RequestPayload = Partial<ResponsePayload>

const BATCH_TIME = Math.floor(1000 / 60);

export class ModernFormsHttpClient {
  constructor(private readonly ip: string) {}

  get = memoize(
    () => axios
      .post<ResponsePayload>(`http://${this.ip}/mf`, { queryDynamicShadowData: 1 })
      .then(res => res.data),
    { maxAge: BATCH_TIME },
  )

  nextUpdatePayloads: RequestPayload[] = []
  nextUpdateCallbacks: Array<(promise: Promise<ResponsePayload>) => void> = []

  update = (payload: RequestPayload) => {
    if (this.nextUpdatePayloads.length === 0) {
      setTimeout(() => {
        const payload = this.nextUpdatePayloads.reduce<RequestPayload>((final, current) => {
          return { ...final, ...current };
        }, {});

        const callbacks = this.nextUpdateCallbacks;

        this.nextUpdatePayloads = [];
        this.nextUpdateCallbacks = [];

        const promise = axios
          .post<ResponsePayload>(`http://${this.ip}/mf`, payload)
          .then(res => res.data);

        callbacks.forEach(callback => callback(promise));
      }, BATCH_TIME);
    }

    return new Promise((res, rej) => {
      this.nextUpdatePayloads.push(payload);
      this.nextUpdateCallbacks.push((promise) => {
        promise.then(res, rej);
      });
    });
  }
}