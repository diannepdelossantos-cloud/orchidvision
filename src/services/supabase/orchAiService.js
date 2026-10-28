import { auth } from '../firebase/firebaseConfig';
import { supabase } from './supabaseClient';

// OrchAi replies come from the `orchai-chat` Supabase Edge Function
// (supabase/functions/orchai-chat), which holds the Gemini API key and the
// Waling-waling-only system prompt. The Firebase ID token is passed so the
// function only serves signed-in OrchidVision users.
export async function sendOrchAiMessage(messages) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Please sign in to use OrchAi.');
  const token = await firebaseUser.getIdToken();

  const { data, error } = await supabase.functions.invoke('orchai-chat', {
    body: { messages: messages.map(({ role, text }) => ({ role, text })) },
    headers: { 'x-firebase-token': token },
  });

  if (error) {
    // FunctionsHttpError carries the function's JSON error message in context.
    let message = 'OrchAi could not answer right now. Please try again.';
    try {
      const body = await error.context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      // Keep the generic message (network failure, non-JSON body, etc.).
    }
    throw new Error(message);
  }

  return data.reply;
}
