declare global {
  interface Window {
    currentUser?: {
      userId: number;
      name: string;
      email: string;
      role: 'admin' | 'host';
    };
    authToken?: string;
  }
}

export {};