import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class OrganizationJwtAuthGuard extends AuthGuard('org-jwt') {}
