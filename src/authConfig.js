import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';

// Values from the Entra ID app registration (Azure portal → App registrations → Comms Hub → Overview).
// They can be overridden at build time with VITE_ENTRA_CLIENT_ID / VITE_ENTRA_TENANT_ID.
// Neither value is a secret: a single-page app has no client secret.
export const entraClientId = import.meta.env.VITE_ENTRA_CLIENT_ID || '';
export const entraTenantId = import.meta.env.VITE_ENTRA_TENANT_ID || '';

export const isEntraConfigured = Boolean(entraClientId && entraTenantId);

const redirectUri = `${window.location.origin}${import.meta.env.BASE_URL}`;

export const msalInstance = isEntraConfigured
  ? new PublicClientApplication({
    auth: {
      clientId: entraClientId,
      authority: `https://login.microsoftonline.com/${entraTenantId}`,
      redirectUri,
      postLogoutRedirectUri: redirectUri,
    },
    cache: { cacheLocation: 'localStorage' },
  })
  : null;

export const loginRequest = { scopes: ['User.Read'], prompt: 'select_account' };

// Resolves the signed-in Microsoft account (after a redirect or from a cached session).
export async function initMicrosoftSignIn() {
  if (!msalInstance) return null;
  await msalInstance.initialize();
  const result = await msalInstance.handleRedirectPromise();
  const account = result?.account || msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null;
  if (account) msalInstance.setActiveAccount(account);
  return account;
}

// A user's sign-in name (UPN) can differ from their mailbox address, so return every candidate.
export const getAccountEmails = (account) => [
  account?.idTokenClaims?.email,
  account?.idTokenClaims?.preferred_username,
  account?.username,
].filter(Boolean).map((value) => value.trim().toLowerCase());

export const startMicrosoftSignIn = () => msalInstance.loginRedirect(loginRequest);

export const startMicrosoftSignOut = () => {
  const account = msalInstance?.getActiveAccount();
  if (!account) return Promise.resolve();
  return msalInstance.logoutRedirect({ account });
};

// Shared team calendar in Microsoft 365. Set ONE of these at build time:
// - VITE_TEAM_CALENDAR_GROUP_ID: the Microsoft 365 group (Teams team) whose calendar everyone shares.
// - VITE_TEAM_CALENDAR_OWNER (+ optional VITE_TEAM_CALENDAR_ID): a mailbox calendar shared with the team with edit rights.
export const teamCalendarConfig = {
  groupId: import.meta.env.VITE_TEAM_CALENDAR_GROUP_ID || '',
  owner: import.meta.env.VITE_TEAM_CALENDAR_OWNER || '',
  calendarId: import.meta.env.VITE_TEAM_CALENDAR_ID || '',
};

export const hasMicrosoftAccount = () => Boolean(msalInstance?.getActiveAccount() || msalInstance?.getAllAccounts()[0]);

export async function acquireGraphToken(scopes) {
  const account = msalInstance?.getActiveAccount() || msalInstance?.getAllAccounts()[0];
  if (!account) throw new Error('Sign in with Microsoft to use the shared team calendar.');
  try {
    const result = await msalInstance.acquireTokenSilent({ scopes, account });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ scopes, account });
    }
    throw error;
  }
}