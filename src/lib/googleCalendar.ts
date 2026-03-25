// Google Calendar API Integration for Aline Herts CRM

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

/**
 * Load Google API scripts
 */
export const loadGoogleScripts = () => {
  return new Promise<void>((resolve) => {
    if (window.gapi && window.google?.accounts?.oauth2) {
      console.log('Google scripts already loaded');
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
          console.log('GAPI client initialized');
          
          // Restore token if exists
          const savedToken = sessionStorage.getItem('g_access_token');
          if (savedToken) {
             window.gapi.client.setToken({ access_token: savedToken });
             console.log('GAPI token restored from session');
          }
          
          checkBeforeResolve();
        } catch (err) {
          console.error('GAPI init error:', err);
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
          callback: '', // defined at request time
        });
        gisInited = true;
        console.log('GIS client initialized');
        checkBeforeResolve();
      } catch (err) {
        console.error('GIS init error:', err);
      }
    };
    document.body.appendChild(gisScript);

    const checkBeforeResolve = () => {
      if (gapiInited && gisInited) resolve();
    };
  });
};

/**
 * Handle Auth Click
 */
export const handleAuthClick = (onSuccess: (token: string) => void, onError: (err: any) => void) => {
  if (!tokenClient) {
    console.error('Token client not ready');
    onError(new Error('Google Auth not ready. Check Client ID and network.'));
    return;
  }

  tokenClient.callback = async (resp: any) => {
    if (resp.error !== undefined) {
      console.error('Google Auth Error:', resp);
      onError(resp);
      return;
    }
    console.log('Google Auth token received');
    sessionStorage.setItem('g_access_token', resp.access_token);
    onSuccess(resp.access_token);
  };

  try {
    const token = window.gapi.client.getToken();
    if (token === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  } catch (err) {
    console.error('Exception in handleAuthClick:', err);
    onError(err);
  }
};

/**
 * Create a Calendar Event
 */
export const createCalendarEvent = async (calendarId: string, event: {
  summary: string;
  description: string;
  start: string;
  end: string;
}) => {
  if (!window.gapi?.client?.calendar) {
    console.log('Calendar API not loaded, attempting to load...');
    await window.gapi.client.load('calendar', 'v3');
  }

  const gEvent = {
    'summary': event.summary,
    'description': event.description,
    'start': {
      'dateTime': event.start,
      'timeZone': 'America/Sao_Paulo'
    },
    'end': {
      'dateTime': event.end,
      'timeZone': 'America/Sao_Paulo'
    }
  };

  try {
    console.log('Sending event to Google Calendar:', calendarId);
    const response = await window.gapi.client.calendar.events.insert({
      'calendarId': calendarId || 'primary',
      'resource': gEvent,
    });
    console.log('Event created successfully:', response.result.id);
    return response.result;
  } catch (err) {
    console.error('Error creating Google event:', err);
    throw err;
  }
};

/**
 * List Events (for testing or agenda view)
 */
export const listUpcomingEvents = async (calendarId: string, timeMin?: string, timeMax?: string) => {
  try {
    const response = await window.gapi.client.calendar.events.list({
      'calendarId': calendarId || 'primary',
      'timeMin': timeMin || (new Date()).toISOString(),
      'timeMax': timeMax,
      'showDeleted': false,
      'singleEvents': true,
      'maxResults': 100,
      'orderBy': 'startTime',
    });
    return response.result.items;
  } catch (err) {
    console.error('Error listing events:', err);
    throw err;
  }
};

/**
 * Check if the current token is valid (in memory or session)
 */
export const isGoogleTokenValid = () => {
  return !!window.gapi?.client?.getToken() || !!sessionStorage.getItem('g_access_token');
};

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
