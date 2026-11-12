/**
 * Vercel Function behind /api/chat: the chat bot's proxy to the Gemini API.
 * All of the logic lives in server/chat.js so the local preview server can run it too.
 */
import { handle } from '../server/chat.js';

export default {
  fetch(request) {
    return handle(request);
  },
};
