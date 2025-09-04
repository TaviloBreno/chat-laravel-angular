import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';

declare global {
  interface Window {
    Pusher: any;
    Echo: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private echo: Echo | null = null;
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private tokenStorage: TokenStorageService) {
    // Make Pusher available globally
    window.Pusher = Pusher;
  }

  initialize(): void {
    if (this.echo) {
      this.disconnect();
    }

    const token = this.tokenStorage.getToken();
    if (!token) {
      console.warn('No auth token found, cannot initialize Echo');
      return;
    }

    this.echo = new Echo({
      broadcaster: 'pusher',
      key: environment.pusher.key,
      cluster: environment.pusher.cluster,
      forceTLS: environment.pusher.forceTLS,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      authEndpoint: environment.wsAuthEndpoint,
    });

    // Listen for connection events
    this.echo.connector.pusher.connection.bind('connected', () => {
      console.log('Echo connected');
      this.connectionStatusSubject.next(true);
    });

    this.echo.connector.pusher.connection.bind('disconnected', () => {
      console.log('Echo disconnected');
      this.connectionStatusSubject.next(false);
    });

    this.echo.connector.pusher.connection.bind('error', (error: any) => {
      console.error('Echo connection error:', error);
      this.connectionStatusSubject.next(false);
    });

    window.Echo = this.echo;
  }

  disconnect(): void {
    if (this.echo) {
      this.echo.disconnect();
      this.echo = null;
      this.connectionStatusSubject.next(false);
    }
  }

  getEcho(): Echo | null {
    return this.echo;
  }

  isConnected(): boolean {
    return this.connectionStatusSubject.value;
  }

  // Listen to private channel
  private(channelName: string): any {
    if (!this.echo) {
      throw new Error('Echo not initialized');
    }
    return this.echo.private(channelName);
  }

  // Listen to presence channel
  join(channelName: string): any {
    if (!this.echo) {
      throw new Error('Echo not initialized');
    }
    return this.echo.join(channelName);
  }

  // Leave channel
  leave(channelName: string): void {
    if (!this.echo) {
      return;
    }
    this.echo.leave(channelName);
  }

  // Listen to public channel
  channel(channelName: string): any {
    if (!this.echo) {
      throw new Error('Echo not initialized');
    }
    return this.echo.channel(channelName);
  }

  // Reconnect with new token
  reconnect(): void {
    this.initialize();
  }
}