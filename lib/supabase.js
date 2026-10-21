import { createClient } from "@supabase/supabase-js";

// Vite injects import.meta.env in the browser; Node scripts read the same names from process.env
const env = import.meta.env ?? process.env;

export const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
