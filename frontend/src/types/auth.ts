export interface UserRegister {
  email: string;
  password: string;
  full_name: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserOut {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
}

export interface TokenOut {
  access_token: string;
  token_type: string; // "bearer"
}
