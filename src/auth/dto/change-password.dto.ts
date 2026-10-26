// src/auth/dto/change-password.dto.ts
import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ 
    description: 'Current password',
    example: 'CurrentPass123!',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({ 
    description: 'New password (min 8 chars, must contain uppercase, lowercase, number, and special character)',
    example: 'NewSecurePass123!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
    }
  )
  newPassword: string;

  @ApiProperty({ 
    description: 'Confirm new password',
    example: 'NewSecurePass123!',
  })
  @IsString()
  confirmPassword: string;
}