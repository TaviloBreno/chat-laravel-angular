import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fullTimestamp',
  standalone: true
})
export class FullTimestampPipe implements PipeTransform {
  transform(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}