import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface AdminCardMetrics {
  total: number;
  active: number;
  inactive: number;
}

export interface EventCardMetrics {
  total: number;
  active: number;
  finished: number;
}

export interface PhotoCardMetrics {
  total: number;
  today: number;
}

export interface PrintCardMetrics {
  total: number;
  week: number;
}

export interface CloudinaryStorageUsage {
  usedGB: number;
  limitGB: number;
  storageUsedPercent: number;
}

export interface InfrastructureHealthDto {
  dbSizeMB: number;
  dbLimitMB: number;
  dbUsedPercent: number;
  activeConnections: number;
  maxConnections: number;
  totalGuests: number;
  mauLimit: number;
  cloudinaryUsedGB: number;
  cloudinaryLimitGB: number;
  cloudinaryPercent: number;
  printConversionRate: number;
  totalLeads: number;
  newLeads: number;
  expiringEvents: number;
}

export interface SuperAdminCardsMetrics {
  admins: AdminCardMetrics;
  events: EventCardMetrics;
  photos: PhotoCardMetrics;
  prints: PrintCardMetrics;
  storage: CloudinaryStorageUsage;
}

export interface RecentActivityFeedItem {
  type: 'EVENT_CREATED' | 'PHOTO_UPLOADED' | 'PRINT_REQUESTED' | string;
  description: string;
  timestamp: string | Date;
  location?: string;
  status?: string;
}

export interface ActivityTrendPoint {
  date: string;
  dayLabel: string;
  photos: number;
  prints: number;
}

export interface ChartsMetricsDto {
  activityTrends: ActivityTrendPoint[];
  eventsDistribution?: {
    active: number;
    finished: number;
    total: number;
  };
}

export interface SuperAdminMetricsResponseDto {
  cards: SuperAdminCardsMetrics;
  infrastructureHealth?: InfrastructureHealthDto;
  charts?: ChartsMetricsDto;
  recentActivity: RecentActivityFeedItem[];
  activityTrends?: ActivityTrendPoint[];
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly _supabase = inject(SupabaseService);

  /**
   * Obtiene las métricas globales consolidadas para SuperAdmin mediante RPC PostgreSQL
   */
  getSuperAdminMetrics(): Observable<SuperAdminMetricsResponseDto> {
    const fetchPromise = async (): Promise<SuperAdminMetricsResponseDto> => {
      const { data, error } = await this._supabase.rpc('get_dashboard_metrics');

      if (error) {
        throw new Error(error.message || 'Error al obtener métricas del dashboard');
      }

      return data as SuperAdminMetricsResponseDto;
    };

    return from(fetchPromise());
  }
}
