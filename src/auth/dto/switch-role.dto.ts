import { IsEnum } from 'class-validator';
import { Role } from '../../common/enum/roles.enum';

export class SwitchRoleDto {
  @IsEnum(Role)
  role: Role;
}