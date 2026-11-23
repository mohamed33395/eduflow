import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { CreateUserDto, ListUsersQuery, UpdateUserDto } from './dto/users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(actor, dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  list(@CurrentUser() actor: AuthUser, @Query() query: ListUsersQuery) {
    return this.users.list(actor, query);
  }

  @Get(':id')
  get(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.users.get(actor, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  @HttpCode(HttpStatus.OK)
  deactivate(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.users.deactivate(actor, id);
  }
}
