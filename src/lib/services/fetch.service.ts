import axios from 'axios';

export class FetchService {
  constructor() {}

  async text(url: string) {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'text',
    });
    return response.data as string;
  }
}
