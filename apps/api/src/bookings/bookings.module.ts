import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { IsIn, IsMongoId, Matches } from 'class-validator';
import { isValidObjectId, Model, Types } from 'mongoose';
import { AuthGuard } from '../auth/auth.module';
import { Property, PropertySchema } from '../properties/property.schema';
class CreateBookingDto {
  @IsMongoId() propertyId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fromDate!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) toDate!: string;
}
class DecisionDto { @IsIn(['approved', 'rejected']) status!: 'approved' | 'rejected'; }
function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); }
function validDate(value: string) { const date = new Date(`${value}T00:00:00Z`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; }
@Injectable()
class BookingsService {
  constructor(@InjectModel(Property.name) private properties: Model<Property>) {}
  async list(user: any) {
    const filter = user.role === 'admin' ? {} : user.role === 'landlord' ? { ownerId: user._id } : { 'bookingRequests.clientId': user._id };
    const properties = await this.properties.find(filter).lean();
    return properties.flatMap(property => (property.bookingRequests || []).filter(booking => user.role !== 'client' || booking.clientId === user._id).map(booking => ({
      ...booking, propertyId: String(property._id), propertyTitle: property.title, propertyAddress: property.address, rent: property.rent, bedrooms: property.bedrooms, propertyDeleted: !!property.deleted,
    }))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async create(dto: CreateBookingDto, user: any) {
    if (user.role !== 'client') throw new ForbiddenException('Only clients can request bookings');
    if (!validDate(dto.fromDate) || !validDate(dto.toDate) || dto.fromDate < today() || dto.toDate <= dto.fromDate) throw new BadRequestException('Choose valid dates: start today or later, with checkout after check-in');
    const booking = { _id: new Types.ObjectId().toString(), clientId: user._id, clientUsername: user.username, fromDate: dto.fromDate, toDate: dto.toDate, status: 'pending' as const, createdAt: new Date().toISOString() };
    const property = await this.properties.findOneAndUpdate({
      _id: dto.propertyId, deleted: { $ne: true }, available: true,
      $and: [
        { bookingRequests: { $not: { $elemMatch: { status: 'approved', fromDate: { $lt: dto.toDate }, toDate: { $gt: dto.fromDate } } } } },
        { bookingRequests: { $not: { $elemMatch: { clientId: user._id, status: 'pending', fromDate: dto.fromDate, toDate: dto.toDate } } } },
      ],
    }, { $push: { bookingRequests: booking } }, { new: true });
    if (!property) throw new ConflictException('Property unavailable, dates already booked, or an identical request is pending');
    return booking;
  }
  async decide(id: string, status: 'approved' | 'rejected', user: any) {
    if (user.role === 'client') throw new ForbiddenException('Only admin or the property landlord can review requests');
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid booking ID');
    const scope = user.role === 'admin' ? {} : { ownerId: user._id };
    const property = await this.properties.findOne({ ...scope, 'bookingRequests._id': id }).lean();
    if (!property) throw new NotFoundException('Booking request not found');
    const booking = property.bookingRequests.find(item => item._id === id)!;
    if (status === 'approved' && booking.fromDate < today()) throw new ConflictException('Cannot approve a request whose check-in date has passed');
    // One atomic update on the property serializes competing approvals, including across API instances.
    const updated = await this.properties.findOneAndUpdate({
      _id: property._id, ...scope,
      bookingRequests: { $elemMatch: { _id: id, status: 'pending' } },
      ...(status === 'approved' ? {
        deleted: { $ne: true }, available: true,
        $nor: [{ bookingRequests: { $elemMatch: { status: 'approved', fromDate: { $lt: booking.toDate }, toDate: { $gt: booking.fromDate } } } }],
      } : {}),
    }, { $set: { 'bookingRequests.$.status': status, 'bookingRequests.$.reviewedBy': user.username, 'bookingRequests.$.reviewedAt': new Date().toISOString() } }, { new: true });
    if (!updated) throw new ConflictException('Request already reviewed, property unavailable, or these dates overlap an approved booking. Refresh requests.');
    return updated.bookingRequests.find(item => item._id === id);
  }
}
@Controller('bookings')
@UseGuards(AuthGuard)
class BookingsController {
  constructor(private bookings: BookingsService) {}
  @Get() list(@Req() req: any) { return this.bookings.list(req.user); }
  @Post() create(@Req() req: any, @Body() dto: CreateBookingDto) { return this.bookings.create(dto, req.user); }
  @Patch(':id') decide(@Req() req: any, @Param('id') id: string, @Body() dto: DecisionDto) { return this.bookings.decide(id, dto.status, req.user); }
}
@Module({ imports: [MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }])], providers: [BookingsService], controllers: [BookingsController] })
export class BookingsModule {}
