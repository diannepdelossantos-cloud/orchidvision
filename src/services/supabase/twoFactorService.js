import { supabase } from './supabaseClient';

// Firebase Auth's own MFA needs SMS (paid Blaze plan) or TOTP enrollment, so
// 2FA here piggybacks on Supabase Auth's free email OTP delivery instead:
// it sends/verifies a 6-digit code against a Supabase "shadow" user that
// shares the same email as the Firebase account, purely to prove inbox
// access. It never becomes the app's session — see the signOut below.
export async function sendTwoFactorCode(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyTwoFactorCode(email, code) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });
  if (error) throw error;

  // Only used to validate the code — Firebase Auth remains the app's actual
  // session, so drop the Supabase session immediately rather than let it
  // linger alongside it.
  await supabase.auth.signOut();
}
