import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true
})
export class TruncatePipe implements PipeTransform {
  transform(text: string, limit: number = 50, suffix: string = '...'): string {
    if (!text) return '';
    
    if (text.length <= limit) {
      return text;
    }
    
    return text.substring(0, limit).trim() + suffix;
  }
}