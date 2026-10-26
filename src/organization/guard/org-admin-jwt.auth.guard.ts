import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OrgAdminJwtAuthGuard extends AuthGuard('org-admin-jwt') {}