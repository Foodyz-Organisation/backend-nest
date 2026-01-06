import { OAuth2Client } from 'google-auth-library';

export async function verifyGoogleToken(idToken: string, clientId?: string) {
  try {
    // Use provided clientId or fallback to environment variable or default
    const WEB_CLIENT_ID = clientId || process.env.GOOGLE_CLIENT_ID;
    const MOBILE_CLIENT_ID = '152459113648-e01p479h7v2cjidjao7jnp4pph6iho2a.apps.googleusercontent.com';

    if (!WEB_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
    }

    // console.log('DEBUG: Verifying Google Token with Client ID:', WEB_CLIENT_ID);

    const client = new OAuth2Client(WEB_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: [WEB_CLIENT_ID, MOBILE_CLIENT_ID], // Allow both Web and Mobile Client IDs
    });

    const payload = ticket.getPayload();
    // payload contains user info: email, name, picture, etc.
    return payload;

  } catch (error) {
    console.error('Error verifying Google ID token:', error);
    throw new Error('Invalid Google ID token');
  }
}
