import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const typeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: configService.get<string>('POSTGRES_HOST') ?? 'localhost',
    port: parseInt(configService.get<string>('POSTGRES_PORT') ?? '5432', 10),
    username: configService.get<string>('POSTGRES_USER') ?? 'postgres',
    password: configService.get<string>('POSTGRES_PASSWORD') ?? 'postgres',
    database: configService.get<string>('POSTGRES_DB') ?? 'ovo_compras',
    entities: [__dirname + '/../modules/**/*.entity.js'],
    synchronize: false,
    migrationsRun: true,
    migrations: [__dirname + '/../migrations/*.js'],
    retryAttempts: 10,
    retryDelay: 3000,
    logging: ['error', 'warn', 'query', 'schema'],
  };
};
