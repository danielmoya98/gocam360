import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from, map, catchError, of, switchMap, tap } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';
import {
  User,
  UserRole,
  LoginResponseDto,
  CheckSessionResponseDto,
  ChangePasswordResponseDto,
} from '../../shared/models/user.model';
import { LoginDto } from '../../pages/login/login.page';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _supabase = inject(SupabaseService);

  private readonly _currentUser = signal<User | null>(this.getStoredUser());
  private readonly _isLoading = signal<boolean>(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly userRole = computed(() => this._currentUser()?.role ?? null);
  readonly isSuperAdmin = computed(() => {
    const role = this._currentUser()?.role;
    return role === 'SUPERADMIN' || role === 'SUPER_ADMIN';
  });
  readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    // Escucha cambios de estado de autenticación en Supabase
    this._supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        this.clearSession();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session.access_token) {
          localStorage.setItem('gocam360_token', session.access_token);
        }
      }
    });

    // Revalida la sesión activa al inicializar
    this.checkSession().subscribe();
  }

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
   * Autenticación con Supabase Auth (signInWithPassword)
   */
  login(credentials: LoginDto): Observable<LoginResponseDto> {
    this._isLoading.set(true);

    const loginPromise = async (): Promise<LoginResponseDto> => {
      const { data, error } = await this._supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Credenciales inválidas');
      }

      const token = data.session?.access_token || '';
      if (token) {
        localStorage.setItem('gocam360_token', token);
      }

      // Obtener el perfil extendido desde public.users
      const { data: profile } = await this._supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const userRole = this.normalizeRole(
        profile?.role || data.user.user_metadata?.['role'] || 'ADMIN'
      );
      const fullName =
        profile?.full_name ||
        data.user.user_metadata?.['full_name'] ||
        data.user.email?.split('@')[0] ||
        'Usuario';

      const user: User = {
        id: data.user.id,
        name: fullName,
        email: data.user.email || credentials.email,
        role: userRole,
        avatar:
          profile?.avatar_url ||
          data.user.user_metadata?.['avatar_url'] ||
          `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        tenantName:
          userRole === 'SUPERADMIN' ? 'gocam360 Global' : 'gocam360 Operations',
      };

      // Actualizar timestamp de último login de manera asíncrona
      this._supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)
        .then();

      this.setSessionUser(user);

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    };

    return from(loginPromise()).pipe(
      tap(() => this._isLoading.set(false)),
      catchError((err) => {
        this._isLoading.set(false);
        throw err;
      })
    );
  }

  /**
   * Sube la foto de perfil exclusivamente a Supabase Storage (Bucket: avatars)
   */
  async uploadAvatar(file: File): Promise<string> {
    const user = this._currentUser();
    if (!user?.id) throw new Error('No hay sesión de usuario activa');

    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await this._supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Error al subir foto de perfil a Supabase Storage');
    }

    const { data: urlData } = this._supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Actualizar avatar_url en public.users
    const { error: dbError } = await this._supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (dbError) {
      throw new Error(dbError.message || 'Error al guardar la URL del avatar en el perfil');
    }

    // Actualizar usuario en sesión
    const updatedUser: User = { ...user, avatar: publicUrl };
    this.setSessionUser(updatedUser);

    return publicUrl;
  }

  /**
   * Verifica la sesión persistida en Supabase
   */
  checkSession(): Observable<User | null> {
    const sessionPromise = async (): Promise<User | null> => {
      const { data: sessionData, error } = await this._supabase.auth.getSession();
      if (error || !sessionData?.session?.user) {
        this.clearSession();
        return null;
      }

      const authUser = sessionData.session.user;
      const token = sessionData.session.access_token;
      if (token) {
        localStorage.setItem('gocam360_token', token);
      }

      // Obtener datos del perfil en public.users
      const { data: profile } = await this._supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const userRole = this.normalizeRole(
        profile?.role || authUser.user_metadata?.['role'] || 'ADMIN'
      );
      const fullName =
        profile?.full_name ||
        authUser.user_metadata?.['full_name'] ||
        authUser.email?.split('@')[0] ||
        'Usuario';

      const user: User = {
        id: authUser.id,
        name: fullName,
        email: authUser.email || '',
        role: userRole,
        avatar:
          profile?.avatar_url ||
          authUser.user_metadata?.['avatar_url'] ||
          `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        tenantName:
          userRole === 'SUPERADMIN' ? 'gocam360 Global' : 'gocam360 Operations',
      };

      this.setSessionUser(user);
      return user;
    };

    return from(sessionPromise()).pipe(
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  /**
   * Cierre de sesión con Supabase Auth
   */
  logout(): Observable<{ message: string }> {
    const logoutPromise = async (): Promise<{ message: string }> => {
      await this._supabase.auth.signOut();
      this.clearSession();
      return { message: 'Sesión cerrada exitosamente' };
    };

    return from(logoutPromise()).pipe(
      catchError(() => {
        this.clearSession();
        return of({ message: 'Sesión cerrada' });
      })
    );
  }

  /**
   * Actualización de contraseña de la cuenta actual
   */
  changePassword(data: {
    currentPassword?: string;
    newPassword: string;
  }): Observable<ChangePasswordResponseDto> {
    const changePromise = async (): Promise<ChangePasswordResponseDto> => {
      const { error } = await this._supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      return { message: 'Contraseña actualizada correctamente' };
    };

    return from(changePromise());
  }

  /**
   * Consulta si la plataforma ya tiene al menos un SuperAdmin configurado
   */
  checkSetupStatus(): Observable<{ isInstalled: boolean }> {
    const checkPromise = async (): Promise<{ isInstalled: boolean }> => {
      // 1. Intentar via RPC function segura
      const { data: rpcResult, error: rpcError } = await this._supabase.rpc('is_platform_installed');
      if (!rpcError && typeof rpcResult === 'boolean') {
        localStorage.setItem('gocam360_installed', String(rpcResult));
        return { isInstalled: rpcResult };
      }

      // 2. Fallback de consulta directa a la tabla users
      const { data, error } = await this._supabase
        .from('users')
        .select('id')
        .eq('role', 'SUPER_ADMIN')
        .limit(1);

      const isInstalled = !error && data && data.length > 0;
      localStorage.setItem('gocam360_installed', String(isInstalled));
      return { isInstalled };
    };

    return from(checkPromise()).pipe(
      catchError(() => {
        const isSetupCompleted = localStorage.getItem('gocam360_installed') === 'true';
        return of({ isInstalled: isSetupCompleted });
      })
    );
  }

  /**
   * Registro del primer SuperAdmin via RPC directo pre-confirmado
   */
  createFirstAdmin(data: {
    name: string;
    email: string;
    password: string;
    companyName?: string;
  }): Observable<LoginResponseDto> {
    this._isLoading.set(true);

    const setupPromise = async (): Promise<LoginResponseDto> => {
      // 1. Invocar RPC segura que crea el usuario pre-confirmado en auth.users y public.users
      const { data: rpcData, error: rpcError } = await this._supabase.rpc('setup_first_admin', {
        p_email: data.email.trim(),
        p_password: data.password,
        p_full_name: data.name.trim(),
        p_company_name: data.companyName?.trim() || 'gocam360 Enterprise',
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'No se pudo completar el setup inicial.');
      }

      // 2. Iniciar sesión automáticamente con Supabase Auth signInWithPassword
      const { data: authData, error: authError } = await this._supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      if (authError || !authData.session) {
        throw new Error(authError?.message || 'Usuario creado pero no se pudo iniciar sesión.');
      }

      const token = authData.session.access_token;
      localStorage.setItem('gocam360_installed', 'true');
      localStorage.setItem('gocam360_token', token);

      const user: User = {
        id: authData.user.id,
        name: data.name.trim(),
        email: data.email.trim(),
        role: 'SUPERADMIN',
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        tenantName: data.companyName || 'gocam360 Enterprise',
      };

      this.setSessionUser(user);

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    };

    return from(setupPromise()).pipe(
      tap({
        next: () => this._isLoading.set(false),
        error: () => this._isLoading.set(false),
      })
    );
  }

  /**
   * Cambiar de rol en caliente para pruebas en desarrollo
   */
  switchRole(role: UserRole): void {
    const current = this._currentUser();
    if (current) {
      const updated = { ...current, role: this.normalizeRole(role) };
      this.setSessionUser(updated);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('gocam360_token');
  }

  setSessionUser(user: User): void {
    this._currentUser.set(user);
    localStorage.setItem('gocam360_user', JSON.stringify(user));
  }

  private clearSession(): void {
    this._currentUser.set(null);
    localStorage.removeItem('gocam360_token');
    localStorage.removeItem('gocam360_user');
  }

  private getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem('gocam360_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed) {
        parsed.role = this.normalizeRole(parsed.role);
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
