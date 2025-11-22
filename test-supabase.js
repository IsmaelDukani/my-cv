const { createClient } = require('@supabase/supabase-js');

const projectId = "savzdbvypcmojbriftix";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdnpkYnZ5cGNtb2picmlmdGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODUwMjcsImV4cCI6MjA3NzE2MTAyN30.beZQHCE7Tvcob9tRq7dGmo9FRi262LOy8262fYfxQNo";

const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
);

async function testConnection() {
    console.log('Testing connection to Supabase...');
    try {
        const { data, error } = await supabase.from('something_that_does_not_exist').select('*').limit(1);
        // It's okay if it errors with "relation does not exist", we just want to see if we reach the server.
        if (error) {
            console.log('Connection successful (received error from server):', error.message);
        } else {
            console.log('Connection successful (received data):', data);
        }
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

testConnection();
