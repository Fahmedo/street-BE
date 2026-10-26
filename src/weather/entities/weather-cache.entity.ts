// src/weather/entities/weather-cache.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,PrimaryColumn
} from 'typeorm';

@Entity('weather_cache')
@Index(['latitude', 'longitude', 'date'], { unique: true })
export class WeatherCache {
      @PrimaryColumn({name: 'cache_id', type: 'uuid', default: () => 'gen_random_uuid()' })

  cacheId: string;

  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ name: 'longitude', type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ name: 'date', type: 'date' })
  date: Date;

  // Weather metrics
  @Column({ name: 'rainfall_mm', type: 'decimal', precision: 6, scale: 2, nullable: true })
  rainfallMm: number;

  @Column({ name: 'temperature_max', type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperatureMax: number;

  @Column({ name: 'temperature_min', type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperatureMin: number;

  @Column({ name: 'temperature_avg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperatureAvg: number;

  @Column({ name: 'humidity', type: 'decimal', precision: 5, scale: 2, nullable: true })
  humidity: number;

  @Column({ name: 'wind_speed', type: 'decimal', precision: 5, scale: 2, nullable: true })
  windSpeed: number;

  @Column({ name: 'weather_code', type: 'int', nullable: true })
  weatherCode: number; // WMO weather codes

  @Column({ name: 'weather_description', type: 'varchar', length: 100, nullable: true })
  weatherDescription: string; // 'Clear', 'Rain', 'Storm', etc.

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}