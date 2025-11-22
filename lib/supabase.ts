import { createClient } from '@supabase/supabase-js';

const projectId = "savzdbvypcmojbriftix";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnpkYnZ5cGNtb2picmlmdGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODUwMjcsImV4cCI6MjA3NzE2MTAyN30.beZQHCE7Tvcob9tRq7dGmo9FRi262LOy8262fYfxQNo";

export const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
);
