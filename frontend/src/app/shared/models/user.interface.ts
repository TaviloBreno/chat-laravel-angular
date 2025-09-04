export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends User {
  email_verified_at?: string;
}