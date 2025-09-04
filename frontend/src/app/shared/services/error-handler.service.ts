import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

export interface ErrorInfo {
  message: string;
  code?: string | number;
  details?: any;
  timestamp: Date;
  userFriendly: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  constructor(private snackBar: MatSnackBar) {}

  handleError(error: any, context?: string): Observable<never> {
    const errorInfo = this.processError(error, context);
    this.logError(errorInfo);
    
    if (errorInfo.userFriendly) {
      this.showUserError(errorInfo.message);
    } else {
      this.showUserError('Ocorreu um erro inesperado. Tente novamente.');
    }

    return throwError(() => errorInfo);
  }

  private processError(error: any, context?: string): ErrorInfo {
    let message = 'Erro desconhecido';
    let code: string | number | undefined;
    let userFriendly = false;

    if (error instanceof HttpErrorResponse) {
      code = error.status;
      
      switch (error.status) {
        case 0:
          message = 'Erro de conexão. Verifique sua internet.';
          userFriendly = true;
          break;
        case 400:
          message = error.error?.message || 'Dados inválidos enviados.';
          userFriendly = true;
          break;
        case 401:
          message = 'Sessão expirada. Faça login novamente.';
          userFriendly = true;
          break;
        case 403:
          message = 'Você não tem permissão para esta ação.';
          userFriendly = true;
          break;
        case 404:
          message = 'Recurso não encontrado.';
          userFriendly = true;
          break;
        case 422:
          message = this.extractValidationErrors(error.error);
          userFriendly = true;
          break;
        case 429:
          message = 'Muitas tentativas. Aguarde um momento.';
          userFriendly = true;
          break;
        case 500:
          message = 'Erro interno do servidor. Tente novamente.';
          userFriendly = true;
          break;
        case 503:
          message = 'Serviço temporariamente indisponível.';
          userFriendly = true;
          break;
        default:
          message = error.error?.message || `Erro HTTP ${error.status}`;
          userFriendly = true;
      }
    } else if (error instanceof Error) {
      message = error.message;
      code = error.name;
    } else if (typeof error === 'string') {
      message = error;
      userFriendly = true;
    } else if (error?.message) {
      message = error.message;
      code = error.code;
      userFriendly = error.userFriendly || false;
    }

    if (context) {
      message = `${context}: ${message}`;
    }

    return {
      message,
      code,
      details: error,
      timestamp: new Date(),
      userFriendly
    };
  }

  private extractValidationErrors(errorResponse: any): string {
    if (errorResponse?.errors) {
      const errors = Object.values(errorResponse.errors).flat() as string[];
      return errors.join(', ');
    }
    return errorResponse?.message || 'Dados inválidos.';
  }

  private logError(errorInfo: ErrorInfo): void {
    console.error('Error logged:', errorInfo);
    
    this.errorLog.unshift(errorInfo);
    
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
  }

  private showUserError(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  showInfo(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['info-snackbar']
    });
  }

  showWarning(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['warning-snackbar']
    });
  }

  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Network status handling
  handleNetworkError(): void {
    this.showUserError('Conexão perdida. Tentando reconectar...');
  }

  handleNetworkReconnect(): void {
    this.showSuccess('Conexão reestabelecida!');
  }
}