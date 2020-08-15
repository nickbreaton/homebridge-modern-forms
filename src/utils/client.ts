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
  private nextUpdatePayloads: RequestPayload[] = []
  private nextUpdateCallbacks: Array<(promise: Promise<ResponsePayload>) => void> = []

  constructor(private readonly ip: string) {}

  // PRIVATE

  private request(payload: RequestPayload & { queryDynamicShadowData?: 1 }) {
    return axios
      .post<ResponsePayload>(`http://${this.ip}/mf`, payload)
      .then(res => res.data);
  }

  // PUBLIC

  public readonly get = memoize(
    () => this.request({ queryDynamicShadowData: 1 }),
    { maxAge: BATCH_TIME },
  )

  public readonly update = (payload: RequestPayload) => {
    if (this.nextUpdatePayloads.length === 0) {
      setTimeout(() => {
        const payload = this.nextUpdatePayloads.reduce<RequestPayload>((final, current) => {
          return { ...final, ...current };
        }, {});

        const callbacks = this.nextUpdateCallbacks;

        this.nextUpdatePayloads = [];
        this.nextUpdateCallbacks = [];

        const promise = this.request(payload);

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