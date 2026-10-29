import { BadRequestException, Body, CanActivate, Controller, Delete, ExecutionContext, ForbiddenException, Get, Global, Injectable, Module, OnModuleInit, Param, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
export type Role = 'admin' | 'landlord' | 'client';
@Schema({ timestamps: true })
class User {
  @Prop({ required: true, unique: true }) username!: string;
  @Prop({ required: true }) passwordHash!: string;
  @Prop({ required: true, enum: ['admin', 'landlord', 'client'] }) role!: Role;
}
@Schema()
class Session {
  @Prop({ required: true, unique: true }) token!: string;
  @Prop({ required: true }) userId!: string;
  @Prop({ required: true, expires: 0 }) expiresAt!: Date;
}
class LoginDto {
  @IsString() @Matches(/^[a-zA-Z0-9_.-]{3,40}$/) username!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}
class SignupDto extends LoginDto { @IsIn(['landlord', 'client']) role!: 'landlord' | 'client'; }
function hash(password: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function digest(token: string) { return createHash('sha256').update(token).digest('hex'); }
@Injectable()
export class AuthService implements OnModuleInit {
  constructor(@InjectModel(User.name) private users: Model<User>, @InjectModel(Session.name) private sessions: Model<Session>) {}
  async onModuleInit() {
    await this.users.init();
    await this.users.updateOne({ username: 'admin' }, { $setOnInsert: { username: 'admin', role: 'admin', passwordHash: hash('admin123@') } }, { upsert: true });
  }
  publicUser(user: any) { return { _id: String(user._id), username: user.username, role: user.role }; }
  async create(dto: SignupDto) {
    try { return this.publicUser(await this.users.create({ username: dto.username.toLowerCase(), passwordHash: hash(dto.password), role: dto.role })); }
    catch (error: any) { if (error.code === 11000) throw new BadRequestException('Username already exists'); throw error; }
  }
  async login(dto: LoginDto, res: any) {
    const user = await this.users.findOne({ username: dto.username.toLowerCase() });
    const [salt, stored] = (user?.passwordHash || hash('invalid-password')).split(':');
    if (!timingSafeEqual(Buffer.from(stored, 'hex'), scryptSync(dto.password, salt, 64)) || !user) throw new UnauthorizedException('Invalid username or password');
    const token = randomBytes(32).toString('hex');
    await this.sessions.create({ token: digest(token), userId: String(user._id), expiresAt: new Date(Date.now() + 86400000) });
    res.cookie('rental_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86400000, path: '/' });
    return this.publicUser(user);
  }
  token(req: any) { return /(?:^|;\s*)rental_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1]; }
  async authenticate(req: any) {
    const token = this.token(req);
    if (!token) throw new UnauthorizedException('Please log in');
    const session = await this.sessions.findOne({ token: digest(token), expiresAt: { $gt: new Date() } });
    const user = session && await this.users.findById(session.userId);
    if (!user) throw new UnauthorizedException('Session expired. Please log in again');
    return this.publicUser(user);
  }
  async logout(req: any, res: any) { const token = this.token(req); if (token) await this.sessions.deleteOne({ token: digest(token) }); res.clearCookie('rental_session', { path: '/' }); return { message: 'Logged out' }; }
  list() { return this.users.find({ role: { $ne: 'admin' } }).select('_id username role').sort({ username: 1 }).lean(); }
  async remove(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid user ID');
    const user = await this.users.findOneAndDelete({ _id: id, role: { $ne: 'admin' } });
    if (!user) throw new BadRequestException('Account not found or cannot be deleted');
    await this.sessions.deleteMany({ userId: id });
    return { message: 'Account deleted' };
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}
  async canActivate(context: ExecutionContext) { const req = context.switchToHttp().getRequest(); req.user = await this.auth.authenticate(req); return true; }
}
@Controller('auth')
class AuthController {
  constructor(private auth: AuthService) {}
  @Post('signup') signup(@Body() dto: SignupDto) { return this.auth.create(dto); }
  @Post('login') login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) { return this.auth.login(dto, res); }
  @Get('me') @UseGuards(AuthGuard) me(@Req() req: any) { return req.user; }
  @Post('logout') logout(@Req() req: any, @Res({ passthrough: true }) res: any) { return this.auth.logout(req, res); }
}
@Controller('users')
@UseGuards(AuthGuard)
class UsersController {
  constructor(private auth: AuthService) {}
  private admin(req: any) { if (req.user.role !== 'admin') throw new ForbiddenException('Admin access required'); }
  @Get() list(@Req() req: any) { this.admin(req); return this.auth.list(); }
  @Post() create(@Req() req: any, @Body() dto: SignupDto) { this.admin(req); return this.auth.create(dto); }
  @Delete(':id') remove(@Req() req: any, @Param('id') id: string) { this.admin(req); return this.auth.remove(id); }
}
@Global()
@Module({ imports: [MongooseModule.forFeature([{ name: User.name, schema: SchemaFactory.createForClass(User) }, { name: Session.name, schema: SchemaFactory.createForClass(Session) }])], providers: [AuthService, AuthGuard], controllers: [AuthController, UsersController], exports: [AuthService, AuthGuard] })
export class AuthModule {}
