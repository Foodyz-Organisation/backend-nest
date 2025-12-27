import { OAuth2Client } from 'google-auth-library';

export async function verifyGoogleToken(idToken: string, clientId?: string) {
  try {
    // Use provided clientId or fallback to environment variable or default
    const WEB_CLIENT_ID = clientId || process.env.GOOGLE_CLIENT_ID;

    if (!WEB_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
    }

    const client = new OAuth2Client(WEB_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: WEB_CLIENT_ID, // Must match your Web Client ID
    });

    const payload = ticket.getPayload();
    // payload contains user info: email, name, picture, etc.
    return payload;

  } catch (error) {
    console.error('Error verifying Google ID token:', error);
    throw new Error('Invalid Google ID token');
  }
}
