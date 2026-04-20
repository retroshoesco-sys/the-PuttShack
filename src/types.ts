export interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
  joinedAt: any;
}

export interface Session {
  id: string;
  name: string;
  status: 'active' | 'finished';
  createdAt: any;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

