import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Organization } from '../entities/organization.entity';
@Injectable()
export class OrganizationFunction {
  public async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public formatOrganizationResponse(organization: Organization) {
    return {
      id: organization.id,
      email: organization.adminEmail,
      fullName: organization.adminName,
      organizationName: organization.organizationName,
      status: organization.status,
      country: organization.country,
      state: organization.state,
      city: organization.city,
    };
  }

  public isValidPassword(password: string) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigits = /\d/.test(password);

    return (
      password.length >= minLength && hasUpperCase && hasLowerCase && hasDigits
    );
  }

  public generateVerificationCode(digits: number = 4): number {
    const max = Math.pow(10, digits) - 1;
    const min = Math.pow(10, digits - 1);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  public generateRandomPassword(): string {
    const length = 15;
    const charset = process.env.PASSWORD_CHARSET;

    if (!charset) {
      throw new Error('PASSWORD_CHARSET environment variable is not set');
    }

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';

    let password = '';
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += digits.charAt(Math.floor(Math.random() * digits.length));

    const remainingLength = length - password.length;
    for (let i = 0; i < remainingLength; ++i) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    password = password
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');

    return password;
  }
}
