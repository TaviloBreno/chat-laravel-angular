import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import { AuthUser } from '../../shared/models';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService
  ) {
    // Initialize current user from storage
    const user = this.tokenStorage.getUser();
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.tokenStorage.saveToken(response.token);
          this.tokenStorage.saveUser(response.user);
          this.currentUserSubject.next(response.user);
        })
      );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, userData)
      .pipe(
        tap(response => {
          this.tokenStorage.saveToken(response.token);
          this.tokenStorage.saveUser(response.user);
          this.currentUserSubject.next(response.user);
        })
      );
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiBaseUrl}/auth/me`)
      .pipe(
        tap(user => {
          this.tokenStorage.saveUser(user);
          this.currentUserSubject.next(user);
        })
      );
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/auth/logout`, {})
      .pipe(
        tap(() => {
          this.clearAuthData();
        })
      );
  }

  clearAuthData(): void {
    this.tokenStorage.clear();
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.tokenStorage.isLoggedIn();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }
}