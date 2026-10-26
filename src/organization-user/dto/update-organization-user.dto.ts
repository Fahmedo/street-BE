import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationUserDto } from './create-organization-user.dto';

export class UpdateOrganizationUserDto extends PartialType(CreateOrganizationUserDto) {}
