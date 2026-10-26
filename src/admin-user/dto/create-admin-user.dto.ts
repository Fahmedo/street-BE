import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AdminUserRole } from 'src/common/enum/admin-user-role';
import { AdminUserStatus } from 'src/common/enum/admin-user-status';
import { Role } from '../../common/enum/roles.enum';


export class CreateAdminUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

   @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

    @IsOptional()
    @IsString()
    address?: string;
  @IsOptional()
  @IsEnum(AdminUserStatus)
  status?: AdminUserStatus;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  roles: Role[]; 
}
