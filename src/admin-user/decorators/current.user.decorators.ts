import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrganizationUser } from 'src/organization-user/entities/organization-user.entity';
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OrganizationUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ organizationUser: OrganizationUser }>();
    return request.organizationUser;
  },
);
