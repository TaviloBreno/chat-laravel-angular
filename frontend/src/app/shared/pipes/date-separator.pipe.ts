import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateSeparator',
  standalone: true
})
export class DateSeparatorPipe implements PipeTransform {
  transform(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateObj.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return dateObj.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }
}