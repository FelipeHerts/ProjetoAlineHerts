// Google Calendar API Integration for Aline Herts CRM

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

const TOKEN_KEY = 'g_access_token';
const TOKEN_EXPIRY_KEY = 'g_token_expiry';
// Tokens do Google expiram em 3600s; renovamos antes disso (3300s = 55 min)
const TOKEN_TTL_MS = 3300 * 1000;

let tokenClient: any;
let gapiInited = false;
let gisInited = false;
let silentRefreshDone = false;

// ── Token helpers ─────────────────────────────────────────────────────────────

function saveToken(accessToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_TTL_MS));
}

function getSavedToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0');
  if (token && Date.now() < expiry) return token;
  // Token expirado — limpa
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  return null;
}

export function clearGoogleToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// ── Script loading ────────────────────────────────────────────────────────────

/**
 * Carrega os scripts da Google API e tenta reconectar silenciosamente
 * se o usuário já consentiu antes.
 */
export const loadGoogleScripts = () => {
  return new Promise<void>((resolve) => {
    if (window.gapi && window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    // GAPI Script
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          });
          gapiInited = true;

          // Restaura token salvo (se ainda não expirou)
          const savedToken = getSavedToken();
          if (savedToken) {
            window.gapi.client.setToken({ access_token: savedToken });
            console.log('[Google] Token restaurado do localStorage');
          }

          checkBeforeResolve();
        } catch (err) {
          console.error('[Google] GAPI init error:', err);
          checkBeforeResolve();
        }
      });
    };
    document.body.appendChild(gapiScript);

    // GIS Script
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      try {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '', // definido na hora da requisição
        });
        gisInited = true;
        checkBeforeResolve();
      } catch (err) {
        console.error('[Google] GIS init error:', err);
        checkBeforeResolve();
      }
    };
    document.body.appendChild(gisScript);

    const checkBeforeResolve = () => {
      if (gapiInited && gisInited) {
        resolve();
        // Tenta reconexão silenciosa após scripts carregados
        trySilentReconnect();
      }
    };
  });
};

/**
 * Tenta obter um novo access token sem mostrar popup ao usuário.
 * Funciona se o usuário já deu consentimento anteriormente.
 * Chamado automaticamente ao iniciar o app.
 */
function trySilentReconnect() {
  if (silentRefreshDone || !tokenClient) return;
  // Só tenta se não há token válido já carregado
  if (getSavedToken()) {
    silentRefreshDone = true;
    return;
  }

  silentRefreshDone = true;
  console.log('[Google] Tentando reconexão silenciosa...');

  tokenClient.callback = (resp: any) => {
    if (resp.error) {
      console.log('[Google] Reconexão silenciosa não disponível (usuário precisa clicar):', resp.error);
      return;
    }
    saveToken(resp.access_token);
    window.gapi.client.setToken({ access_token: resp.access_token });
    console.log('[Google] Reconectado silenciosamente ✅');
  };

  try {
    // prompt: '' = sem popup; pode falhar silenciosamente se não há sessão ativa
    tokenClient.requestAccessToken({ prompt: '' });
  } catch {
    console.log('[Google] Reconexão silenciosa falhou — aguardando ação do usuário');
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Abre o popup de autenticação do Google (chamado pelo botão "Conectar").
 */
export const handleAuthClick = (
  onSuccess: (token: string) => void,
  onError: (err: any) => void
) => {
  if (!tokenClient) {
    onError(new Error('Google Auth não está pronto. Verifique o Client ID e a rede.'));
    return;
  }

  tokenClient.callback = async (resp: any) => {
    if (resp.error !== undefined) {
      console.error('[Google] Auth Error:', resp);
      onError(resp);
      return;
    }
    saveToken(resp.access_token);
    window.gapi.client.setToken({ access_token: resp.access_token });
    console.log('[Google] Autenticado com sucesso ✅');
    onSuccess(resp.access_token);
  };

  try {
    const token = window.gapi.client.getToken();
    // Se não há token em memória, pede consentimento completo
    tokenClient.requestAccessToken({ prompt: token === null ? 'consent' : '' });
  } catch (err) {
    console.error('[Google] Exception in handleAuthClick:', err);
    onError(err);
  }
};

// ── Calendar API ──────────────────────────────────────────────────────────────

export const createCalendarEvent = async (calendarId: string, event: {
  summary: string;
  description: string;
  start: string;
  end: string;
}) => {
  if (!window.gapi?.client?.calendar) {
    await window.gapi.client.load('calendar', 'v3');
  }

  const response = await window.gapi.client.calendar.events.insert({
    calendarId: calendarId || 'primary',
    resource: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: event.end, timeZone: 'America/Sao_Paulo' },
    },
  });
  return response.result;
};

export const listUpcomingEvents = async (calendarId: string, timeMin?: string, timeMax?: string) => {
  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId: calendarId || 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax,
      showDeleted: false,
      singleEvents: true,
      maxResults: 100,
      orderBy: 'startTime',
    });
    return response.result.items;
  } catch (err) {
    console.error('[Google] Error listing events:', err);
    throw err;
  }
};

export const isGoogleTokenValid = () => {
  return !!getSavedToken() || !!window.gapi?.client?.getToken();
};

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
