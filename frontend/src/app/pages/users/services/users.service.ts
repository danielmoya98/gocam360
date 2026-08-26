import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of, tap } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { UserRole } from '../../../shared/models/user.model';

export interface AdminUserResponseDto {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  status: boolean;
  lastLoginAt: string | Date | null;
  createdAt: string | Date;
}

export interface CreateAdminDto {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  status?: boolean;
}

export interface UpdateAdminDto {
  fullName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly _supabase = inject(SupabaseService);

  private readonly _users = signal<AdminUserResponseDto[] | null>(null);
  readonly users = this._users.asReadonly();

  /**
   * Normaliza los roles ('SUPER_ADMIN' ➔ 'SUPERADMIN')
   */
  private normalizeRole(rawRole?: string | null): UserRole {
    if (rawRole === 'SUPER_ADMIN' || rawRole === 'SUPERADMIN') {
      return 'SUPERADMIN';
    }
    return 'ADMIN';
  }

  /**
   * Mapea un registro de la tabla public.users a AdminUserResponseDto
   */
  private mapUserRow(row: Record<string, any>): AdminUserResponseDto {
    return {
      id: row['id'],
      fullName: row['full_name'] || row['fullName'] || row['email']?.split('@')[0] || 'Usuario',
      email: row['email'],
      avatarUrl: row['avatar_url'] || row['avatarUrl'] || null,
      role: this.normalizeRole(row['role']),
      status: row['status'] ?? true,
      lastLoginAt: row['last_login_at'] || row['lastLoginAt'] || null,
      createdAt: row['created_at'] || row['createdAt'] || new Date(),
    };
  }

  /**
   * Obtener todos los administradores y operadores desde public.users
   */
  findAll(forceRefresh = false): Observable<AdminUserResponseDto[]> {
    if (this._users() && !forceRefresh) {
      return of(this._users()!);
    }

    const fetchPromise = async (): Promise<AdminUserResponseDto[]> => {
      const { data, error } = await this._supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Error al obtener la lista de usuarios');
      }

      return ((data as Record<string, any>[]) || []).map((row) => this.mapUserRow(row));
    };

    return from(fetchPromise()).pipe(
      tap((data) => this._users.set(data))
    );
  }

  /**
   * Obtener detalles de un administrador por ID
   */
  findOne(id: string): Observable<AdminUserResponseDto> {
    const fetchPromise = async (): Promise<AdminUserResponseDto> => {
      const { data, error } = await this._supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Usuario no encontrado');
      }

      return this.mapUserRow(data as Record<string, any>);
    };

    return from(fetchPromise());
  }

  /**
   * Crear un nuevo operador o admin via RPC segura en Supabase
   */
  create(data: CreateAdminDto): Observable<AdminUserResponseDto> {
    const createPromise = async (): Promise<AdminUserResponseDto> => {
      const { data: result, error } = await this._supabase.rpc('create_operator_user', {
        p_email: data.email.trim(),
        p_password: data.password,
        p_full_name: data.fullName.trim(),
        p_role: data.role === 'SUPERADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
      });

      if (error) {
        throw new Error(error.message || 'Error al crear el operador');
      }

      const newUser = this.mapUserRow(result as Record<string, any>);

      // Si el estado inicial era inactivo, actualizarlo
      if (data.status === false) {
        await this._supabase
          .from('users')
          .update({ status: false })
          .eq('id', newUser.id);
        newUser.status = false;
      }

      return newUser;
    };

    return from(createPromise()).pipe(
      tap((newUser) => {
        if (this._users()) {
          this._users.update((list) => [newUser, ...(list || [])]);
        }
      })
    );
  }

  /**
   * Actualizar un operador existente via RPC segura
   */
  update(id: string, data: UpdateAdminDto): Observable<AdminUserResponseDto> {
    const updatePromise = async (): Promise<AdminUserResponseDto> => {
      const roleParam = data.role
        ? data.role === 'SUPERADMIN'
          ? 'SUPER_ADMIN'
          : 'ADMIN'
        : null;

      const { data: result, error } = await this._supabase.rpc('admin_update_user', {
        p_user_id: id,
        p_full_name: data.fullName ? data.fullName.trim() : null,
        p_role: roleParam,
        p_status: typeof data.status === 'boolean' ? data.status : null,
        p_password: data.password && data.password.length >= 6 ? data.password : null,
      });

      if (error) {
        throw new Error(error.message || 'Error al actualizar usuario');
      }

      return this.mapUserRow(result as Record<string, any>);
    };

    return from(updatePromise()).pipe(
      tap((updated) => {
        if (this._users()) {
          this._users.update((list) =>
            (list || []).map((u) => (u.id === id ? updated : u))
          );
        }
      })
    );
  }

  /**
   * Eliminar un operador via RPC segura
   */
  remove(id: string): Observable<{ message: string }> {
    const deletePromise = async (): Promise<{ message: string }> => {
      const { error } = await this._supabase.rpc('admin_delete_user', {
        p_user_id: id,
      });

      if (error) {
        throw new Error(error.message || 'Error al eliminar usuario');
      }

      return { message: 'Usuario eliminado correctamente' };
    };

    return from(deletePromise()).pipe(
      tap(() => {
        if (this._users()) {
          this._users.update((list) => (list || []).filter((u) => u.id !== id));
        }
      })
    );
  }

  /**
   * Eliminar múltiples operadores
   */
  bulkRemove(ids: string[]): Observable<{ message: string }> {
    const bulkPromise = async (): Promise<{ message: string }> => {
      for (const id of ids) {
        const { error } = await this._supabase.rpc('admin_delete_user', {
          p_user_id: id,
        });
        if (error) {
          throw new Error(error.message || `Error al eliminar usuario con ID ${id}`);
        }
      }
      return { message: `${ids.length} usuarios eliminados correctamente` };
    };

    return from(bulkPromise()).pipe(
      tap(() => {
        if (this._users()) {
          this._users.update((list) => (list || []).filter((u) => !ids.includes(u.id)));
        }
      })
    );
  }
}
