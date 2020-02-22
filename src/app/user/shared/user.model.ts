export interface UserSource {
  id: string,
  firstName: string,
  lastName: string,
  avatar: string,
  email: string,
}

export class UserModel {
  public id: string;
  public firstName: string;
  public lastName: string;
  public avatar: string;
  public email: string;
  public providerLogin: boolean;

  constructor(source: UserSource) {
    this.id = source.id;
    this.firstName = source.firstName;
    this.lastName = source.lastName;
    this.avatar = source.avatar;
    this.email = source.email;
    this.providerLogin = /@.+\.passport/.test(this.email);
  }
}