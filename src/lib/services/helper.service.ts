export class HelperService {
  constructor() {}

  stringsBetweens(
    text: string,
    starts: string,
    ends: string,
    filter?: (item: string) => boolean
  ) {
    const results =
      text.match(new RegExp(`(?<=(${starts})).+?(?=(${ends}))`, 'g')) || [];
    return !filter ? results : results.filter(filter);
  }
}
