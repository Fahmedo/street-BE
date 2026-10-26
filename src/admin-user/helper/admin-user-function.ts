import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../entities/admin-user.entity';
@Injectable()
export class AdminUserFunction {
  public async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public formatAdminUserResponse(admin: AdminUser) {
    return {
      id: admin.id,
      email: admin.email,
      fullName: `${admin.firstName} ${admin.lastName}`.trim(),
      roles: admin.roles,
      status: admin.status,
      joinedAt: this.dateFormat(admin.createdAt),
    };
  }

  public dateFormat(input?: Date | string): string {
    if (!input) return '';

    const date = input instanceof Date ? input : new Date(input);

    if (isNaN(date.getTime())) return '';

    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();

    const suffix =
      day % 10 === 1 && day !== 11
        ? 'st'
        : day % 10 === 2 && day !== 12
          ? 'nd'
          : day % 10 === 3 && day !== 13
            ? 'rd'
            : 'th';

    return `${day}${suffix} ${month} ${year}`;
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
