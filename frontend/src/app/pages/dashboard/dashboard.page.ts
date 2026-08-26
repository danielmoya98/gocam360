import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../entities/session/auth.service';
import { ThemeService } from '../../shared/services/theme.service';
import { TopbarWidget } from '../../widgets/topbar/topbar.widget';
import { SidebarWidget } from '../../widgets/sidebar/sidebar.widget';
import { SuperadminViewComponent } from './superadmin-view/superadmin-view.component';
import { AdminViewComponent } from './admin-view/admin-view.component';
import { DrawerComponent } from '../../shared/ui/drawer/drawer.component';
import { CommandPaletteComponent } from '../../shared/ui/command-palette/command-palette.component';
import { IconComponent, IconName } from '../../shared/ui/icon/icon.component';
import { PreferencesService } from '../../shared/services/preferences.service';
import { TourService } from '../../core/services/tour.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TopbarWidget,
    SidebarWidget,
    SuperadminViewComponent,
    AdminViewComponent,
    DrawerComponent,
    CommandPaletteComponent,
    IconComponent,
  ],
  template: `
    <div class="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      
      <!-- Sidebar Navigation -->
      <app-sidebar [isCollapsed]="isSidebarCollapsed()" (toggleCollapse)="toggleSidebar()" />

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        
        <!-- Topbar Header with Breadcrumbs & Sidebar Toggle -->
        <app-topbar
          [isSidebarCollapsed]="isSidebarCollapsed()"
          (toggleSidebar)="toggleSidebar()"
          (toggleMobileDrawer)="isMobileNavOpen.set(true)"
          (openCommandPalette)="isCommandPaletteOpen.set(true)"
        />

        <!-- Main Body (Allows mouse scroll, hides scrollbar visually) -->
        <main class="flex-1 p-5 md:p-6 overflow-y-auto no-scrollbar">
          <router-outlet />
          
          <!-- Default Dashboard Views when at /dashboard base path -->
          @if (isRootDashboardRoute()) {
            @if (userRole() === 'ADMIN') {
              <app-admin-view />
            } @else {
              <app-superadmin-view />
            }
          }
        </main>
      </div>

      <!-- Command Palette Modal (Cmd + K) -->
      <app-command-palette [(isOpen)]="isCommandPaletteOpen" />

      <!-- Mobile Navigation Drawer (Right-to-Left Slide Over Sheet) -->
      <app-drawer
        [(isOpen)]="isMobileNavOpen"
        title="Navegación & Menú Móvil"
        subtitle="gocam360 Enterprise Platform"
      >
        <div class="h-full flex flex-col justify-between space-y-6 pt-1">
          <!-- User Profile Card Header -->
          @if (user(); as u) {
            <div class="p-3.5 rounded-xl border border-border bg-card flex items-center gap-3 shadow-xs">
              <img [src]="u.avatar" [alt]="u.name" class="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30 shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="font-extrabold text-foreground text-sm leading-tight truncate">{{ u.name }}</p>
                <span class="text-[11px] text-muted-foreground font-mono truncate block">{{ u.email }}</span>
              </div>
            </div>
          }

          <!-- Navigation Links by Categories -->
          <div class="space-y-5 flex-1">
            @for (group of navGroups(); track group.category) {
              <div class="space-y-1.5">
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2">
                  {{ group.category }}
                </span>
                <div class="space-y-0.5">
                  @for (item of group.items; track item.route) {
                    <a
                      [routerLink]="item.route"
                      routerLinkActive="bg-primary text-primary-foreground font-bold"
                      [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                      (click)="isMobileNavOpen.set(false)"
                      class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    >
                      <app-icon [name]="item.icon" class="w-4 h-4" />
                      <span>{{ item.label }}</span>
                    </a>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Bottom Logout Button -->
          <div class="pt-4 border-t border-border">
            <button
              type="button"
              (click)="logout()"
              class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              <app-icon name="trash" class="w-4 h-4 text-rose-400" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </app-drawer>
    </div>
  `,
})
export class DashboardPage implements OnInit {
  private readonly _authService = inject(AuthService);
  private readonly _router = inject(Router);
  private readonly _preferencesService = inject(PreferencesService);
  private readonly _tourService = inject(TourService);

  ngOnInit(): void {
    setTimeout(() => {
      this._tourService.startTour(undefined, false);
    }, 600);
  }

  protected readonly user = this._authService.currentUser;

  private readonly currentUrl = toSignal(
    this._router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects || e.url)
    ),
    { initialValue: this._router.url }
  );

  protected readonly isRootDashboardRoute = computed(() => {
    const url = this.currentUrl();
    return url === '/dashboard' || url === '/dashboard/';
  });

  protected readonly userRole = this._authService.userRole;
  protected readonly isSidebarCollapsed = this._preferencesService.isSidebarCollapsed;

  protected readonly isMobileNavOpen = signal(false);
  protected readonly isCommandPaletteOpen = signal(false);

  protected readonly navGroups = computed(() => {
    const role = this.userRole();
    return [
      {
        category: 'Aplicación',
        items: [
          { label: 'Dashboard', icon: 'dashboard' as IconName, route: '/dashboard' },
          ...(role === 'SUPERADMIN'
            ? [
                { label: 'Usuarios', icon: 'users' as IconName, route: '/dashboard/users' },
                { label: 'Bitácora / Auditoría', icon: 'info' as IconName, route: '/dashboard/audit-logs' },
              ]
            : []),
          { label: 'Eventos', icon: 'events' as IconName, route: '/dashboard/events' },
          { label: 'Impresiones', icon: 'prints' as IconName, route: '/dashboard/prints' },
          ...(role === 'SUPERADMIN'
            ? [{ label: 'CRM Leads', icon: 'phone' as IconName, route: '/dashboard/crm-leads' }]
            : []),
        ],
      },
      ...(role === 'SUPERADMIN'
        ? [
            {
              category: 'Sistema',
              items: [
                { label: 'Configuración', icon: 'settings' as IconName, route: '/dashboard/settings' },
              ],
            },
          ]
        : []),
      {
        category: 'Cuenta',
        items: [
          { label: 'Mi Perfil', icon: 'crown' as IconName, route: '/dashboard/profile' },
          { label: 'Ayuda & Soporte', icon: 'help' as IconName, route: '/dashboard/help-support' },
        ],
      },
    ];
  });

  toggleSidebar(): void {
    this._preferencesService.toggleSidebar();
  }

  logout(): void {
    this.isMobileNavOpen.set(false);
    this._authService.logout().subscribe({
      next: () => this._router.navigate(['/login']),
      error: () => this._router.navigate(['/login']),
    });
  }
}
