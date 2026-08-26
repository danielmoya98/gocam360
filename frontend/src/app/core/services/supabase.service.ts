import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  public readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
      }
    );
  }

  get auth() {
    return this.client.auth;
  }

  get storage() {
    return this.client.storage;
  }

  from<T = any>(table: string) {
    return this.client.from(table);
  }

  channel(name: string): RealtimeChannel {
    return this.client.channel(name);
  }

  rpc(fn: string, args?: Record<string, any>) {
    return this.client.rpc(fn, args);
  }

  /**
   * Helper simplificado para suscripciones en tiempo real
   */
  subscribeToChannel(
    channelName: string,
    table: string,
    callback: (payload: any) => void,
    filter?: string
  ): RealtimeChannel {
    const config: any = {
      event: '*',
      schema: 'public',
      table,
    };
    if (filter) {
      config.filter = filter;
    }

    return this.client
      .channel(channelName)
      .on('postgres_changes', config, callback)
      .subscribe();
  }

  removeChannel(channel: RealtimeChannel) {
    return this.client.removeChannel(channel);
  }
}
