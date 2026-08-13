// Not imported by App.Web: unlike the interfaces in grid-dto.ts, these are
// real (value) exports, and App.Server isn't an ES module, so App.Web's tsc
// can't validate this file. App.Web mirrors the values it needs locally.
export enum GridCellEnum {
  None = 0,
  Text = 1,
  Header = 2,
  Custom = 3,
}

export enum GridCustomEnum {
  None = 0,
  Button = 1,
}
