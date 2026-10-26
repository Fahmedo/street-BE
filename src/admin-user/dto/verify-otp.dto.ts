import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'otp is required' })
  @IsNumber()
  otp: number;
}
