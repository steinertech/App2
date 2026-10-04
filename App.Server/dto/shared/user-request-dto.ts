export enum UserRequestEnum {
  None = 0,
  Register = 1,
  Login = 2,
  Logout = 3,
  Session = 4,
}

export interface UserRequestDto {
  requestEnum?: UserRequestEnum;
  email?: string;
  password?: string;
}

/** Response of /api/user. Never carries sessionId (HttpOnly cookie). */
export interface UserResponseDto {
  success?: boolean;
  email?: string;
  projectName?: string;
  domainName?: string;
}
