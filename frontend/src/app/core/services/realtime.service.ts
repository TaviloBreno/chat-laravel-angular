import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, Subject, fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
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

export interface RealtimeEvent {
  type: string;
  data: any;
  channel?: string;
  timestamp: Date;
}

export interface PresenceUser {
  id: number;
  name: string;
  avatar?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private echo: any = null;
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private reconnectingSubject = new BehaviorSubject<boolean>(false);
  private eventsSubject = new Subject<RealtimeEvent>();
  private activeChannels = new Set<string>();
  private presenceChannels = new Map<string, any>();
  private privateChannels = new Map<string, any>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeouts = [1000, 2000, 5000, 10000, 15000, 30000];
  private destroy$ = new Subject<void>();
  
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public isConnected$ = this.connectionStatusSubject.asObservable();
  public reconnecting$ = this.reconnectingSubject.asObservable();
  public events$ = this.eventsSubject.asObservable();

  constructor(
    private tokenStorage: TokenStorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Make Pusher available globally only in browser
    if (isPlatformBrowser(this.platformId)) {
      window.Pusher = Pusher;
      this.setupVisibilityChangeHandler();
    }
  }

  initialize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.echo) {
      this.disconnect();
    }

    const token = this.tokenStorage.getToken();
    if (!token) {
      console.warn('No auth token found, cannot initialize Echo');
      return;
    }

    try {
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
        enabledTransports: ['ws', 'wss'],
        disabledTransports: ['xhr_polling', 'xhr_streaming', 'htmlfile']
      });

      this.setupConnectionHandlers();
      this.logEvent('echo_initialized', { token: token ? 'present' : 'missing' });
      
      if (isPlatformBrowser(this.platformId)) {
        window.Echo = this.echo;
      }
    } catch (error) {
      console.error('Failed to initialize Echo:', error);
      this.logEvent('echo_init_error', { error: error });
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.echo) {
      // Leave all active channels before disconnecting
      this.activeChannels.forEach(channel => {
        try {
          this.echo.leave(channel);
        } catch (error) {
          console.warn(`Failed to leave channel ${channel}:`, error);
        }
      });
      
      this.echo.disconnect();
      this.echo = null;
      this.connectionStatusSubject.next(false);
      this.reconnectingSubject.next(false);
      this.activeChannels.clear();
      this.presenceChannels.clear();
      this.privateChannels.clear();
      this.logEvent('echo_disconnected', {});
    }
  }

  destroy(): void {
    this.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  getEcho(): any {
    return this.echo;
  }

  isConnected(): boolean {
    return this.connectionStatusSubject.value;
  }

  isReconnecting(): boolean {
    return this.reconnectingSubject.value;
  }

  // Helper methods for conversation channels
  subscribeToConversation(conversationId: number): void {
    if (!this.echo || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const presenceChannelName = `presence-conversation.${conversationId}`;
    const privateChannelName = `private-conversation.${conversationId}`;

    try {
      // Subscribe to presence channel
      const presenceChannel = this.echo.join(presenceChannelName);
      this.presenceChannels.set(presenceChannelName, presenceChannel);
      this.activeChannels.add(presenceChannelName);

      // Handle presence events
      presenceChannel
        .here((users: PresenceUser[]) => {
          this.logEvent('presence_here', { channel: presenceChannelName, users });
          this.eventsSubject.next({
            type: 'presence.here',
            data: { users, conversationId },
            channel: presenceChannelName,
            timestamp: new Date()
          });
        })
        .joining((user: PresenceUser) => {
          this.logEvent('presence_joining', { channel: presenceChannelName, user });
          this.eventsSubject.next({
            type: 'presence.joining',
            data: { user, conversationId },
            channel: presenceChannelName,
            timestamp: new Date()
          });
        })
        .leaving((user: PresenceUser) => {
          this.logEvent('presence_leaving', { channel: presenceChannelName, user });
          this.eventsSubject.next({
            type: 'presence.leaving',
            data: { user, conversationId },
            channel: presenceChannelName,
            timestamp: new Date()
          });
        });

      // Subscribe to private channel
      const privateChannel = this.echo.private(privateChannelName);
      this.privateChannels.set(privateChannelName, privateChannel);
      this.activeChannels.add(privateChannelName);

      // Handle message events
      privateChannel
        .listen('MessageSent', (event: any) => {
          this.logEvent('message_sent', { channel: privateChannelName, event });
          this.eventsSubject.next({
            type: 'message.sent',
            data: { ...event, conversationId },
            channel: privateChannelName,
            timestamp: new Date()
          });
        })
        .listen('MessageUpdated', (event: any) => {
          this.logEvent('message_updated', { channel: privateChannelName, event });
          this.eventsSubject.next({
            type: 'message.updated',
            data: { ...event, conversationId },
            channel: privateChannelName,
            timestamp: new Date()
          });
        })
        .listen('MessageDeleted', (event: any) => {
          this.logEvent('message_deleted', { channel: privateChannelName, event });
          this.eventsSubject.next({
            type: 'message.deleted',
            data: { ...event, conversationId },
            channel: privateChannelName,
            timestamp: new Date()
          });
        })
        .listen('TypingStarted', (event: any) => {
          this.logEvent('typing_started', { channel: privateChannelName, event });
          this.eventsSubject.next({
            type: 'typing.started',
            data: { ...event, conversationId },
            channel: privateChannelName,
            timestamp: new Date()
          });
        })
        .listen('TypingStopped', (event: any) => {
          this.logEvent('typing_stopped', { channel: privateChannelName, event });
          this.eventsSubject.next({
            type: 'typing.stopped',
            data: { ...event, conversationId },
            channel: privateChannelName,
            timestamp: new Date()
          });
        });

      this.logEvent('conversation_subscribed', { conversationId, channels: [presenceChannelName, privateChannelName] });
    } catch (error) {
      console.error(`Failed to subscribe to conversation ${conversationId}:`, error);
      this.logEvent('conversation_subscribe_error', { conversationId, error });
    }
  }

  leaveConversation(conversationId: number): void {
    if (!this.echo) {
      return;
    }

    const presenceChannelName = `presence-conversation.${conversationId}`;
    const privateChannelName = `private-conversation.${conversationId}`;

    try {
      // Leave presence channel
      if (this.presenceChannels.has(presenceChannelName)) {
        this.echo.leave(presenceChannelName);
        this.presenceChannels.delete(presenceChannelName);
        this.activeChannels.delete(presenceChannelName);
      }

      // Leave private channel
      if (this.privateChannels.has(privateChannelName)) {
        this.echo.leave(privateChannelName);
        this.privateChannels.delete(privateChannelName);
        this.activeChannels.delete(privateChannelName);
      }

      this.logEvent('conversation_left', { conversationId, channels: [presenceChannelName, privateChannelName] });
    } catch (error) {
      console.error(`Failed to leave conversation ${conversationId}:`, error);
      this.logEvent('conversation_leave_error', { conversationId, error });
    }
  }

  resubscribeAll(): void {
    if (!this.echo || !isPlatformBrowser(this.platformId)) {
      return;
    }

    // Extract conversation IDs from active channels
    const conversationIds = new Set<number>();
    this.activeChannels.forEach(channel => {
      const match = channel.match(/conversation\.(\d+)$/);
      if (match) {
        conversationIds.add(parseInt(match[1], 10));
      }
    });

    // Clear current subscriptions
    this.activeChannels.clear();
    this.presenceChannels.clear();
    this.privateChannels.clear();

    // Resubscribe to all conversations
    conversationIds.forEach(id => {
      this.subscribeToConversation(id);
    });

    this.logEvent('resubscribed_all', { conversationIds: Array.from(conversationIds) });
  }

  // Legacy methods for backward compatibility
  private(channelName: string): any {
    if (!this.echo) {
      throw new Error('Echo not initialized');
    }
    return this.echo.private(channelName);
  }

  join(channelName: string): any {
    if (!this.echo) {
      throw new Error('Echo not initialized');
    }
    return this.echo.join(channelName);
  }

  leave(channelName: string): void {
    if (!this.echo) {
      return;
    }
    this.echo.leave(channelName);
  }

  channel(channelName: string): any {
    if (!this.echo) {
      throw new Error('Echo not initialized');
    }
    return this.echo.channel(channelName);
  }

  // Reconnect with new token
  reconnect(): void {
    this.reconnectAttempts = 0;
    this.initialize();
  }

  // Private helper methods
  private setupConnectionHandlers(): void {
    if (!this.echo?.connector?.pusher?.connection) {
      return;
    }

    const connection = this.echo.connector.pusher.connection;

    connection.bind('connected', () => {
      console.log('Echo connected');
      this.connectionStatusSubject.next(true);
      this.reconnectingSubject.next(false);
      this.reconnectAttempts = 0;
      this.logEvent('echo_connected', {});
      
      // Resubscribe to all channels after reconnection
      if (this.activeChannels.size > 0) {
        setTimeout(() => this.resubscribeAll(), 1000);
      }
    });

    connection.bind('disconnected', () => {
      console.log('Echo disconnected');
      this.connectionStatusSubject.next(false);
      this.logEvent('echo_disconnected', {});
      this.scheduleReconnect();
    });

    connection.bind('error', (error: any) => {
      console.error('Echo connection error:', error);
      this.connectionStatusSubject.next(false);
      this.logEvent('echo_error', { error });
      this.scheduleReconnect();
    });

    connection.bind('unavailable', () => {
      console.warn('Echo connection unavailable');
      this.connectionStatusSubject.next(false);
      this.logEvent('echo_unavailable', {});
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.logEvent('max_reconnect_attempts', { attempts: this.reconnectAttempts });
      return;
    }

    const timeoutIndex = Math.min(this.reconnectAttempts, this.reconnectTimeouts.length - 1);
    const timeout = this.reconnectTimeouts[timeoutIndex];
    
    this.reconnectingSubject.next(true);
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${timeout}ms`);
    this.logEvent('reconnect_scheduled', { attempt: this.reconnectAttempts, timeout });
    
    setTimeout(() => {
      if (!this.isConnected()) {
        this.initialize();
      }
    }, timeout);
  }

  private setupVisibilityChangeHandler(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    fromEvent(document, 'visibilitychange')
      .pipe(
        debounceTime(1000),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (document.visibilityState === 'visible') {
          // Tab became visible - check connection and resubscribe if needed
          if (!this.isConnected() && this.tokenStorage.getToken()) {
            this.logEvent('visibility_reconnect', {});
            this.reconnect();
          }
        }
      });
  }

  private logEvent(type: string, data: any): void {
    const event = {
      type: `realtime.${type}`,
      data,
      timestamp: new Date()
    };
    
    console.log(`[RealtimeService] ${type}:`, data);
    
    // Here you could send to external logging service like Sentry or Axiom
    // if (environment.production && window.Sentry) {
    //   window.Sentry.addBreadcrumb({
    //     category: 'realtime',
    //     message: type,
    //     data,
    //     level: 'info'
    //   });
    // }
  }
}