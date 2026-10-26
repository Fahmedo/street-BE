import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {}
