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

export class ModernFormsHttpClient {
  constructor(private readonly ip: string) {}

  get = memoize(
    () => axios
      .post<ResponsePayload>(`http://${this.ip}/mf`, { queryDynamicShadowData: 1 })
      .then(res => res.data),
    { maxAge: 10 },
  )

  update = (payload: RequestPayload) => {
    return axios
      .post<ResponsePayload>(`http://${this.ip}/mf`, payload)
      .then(res => res.data);
  }
}