export enum AlertEnum {
  Success = 'Success',
  Info = 'Info',
  Warning = 'Warning',
  Error = 'Error',
}

/** Alert message shown in App.Web's NavState. Sent by App.Server in ApiResponseDto.alerts (see alertAdd). */
export interface AlertDto {
  alertEnum: AlertEnum;
  text: string;
}
