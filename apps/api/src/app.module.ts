import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsModule } from './bookings/bookings.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';

@Module({ imports: [
  ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
  MongooseModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ uri: config.get('MONGODB_URI', 'mongodb://127.0.0.1:27017/rental_property') }) }),
  AuthModule, PropertiesModule, BookingsModule,
] })
export class AppModule {}
