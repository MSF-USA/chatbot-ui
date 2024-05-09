export interface Account {
    provider: string,
    type: string,
    providerAccountId: string,
    token_type: string,
    scope: string,
    expires_at: number,
    ext_expires_in: number | null,
    access_token: string,
    refresh_token: string,
    id_token: string,
    session_state: string
  }
