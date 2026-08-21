const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

module.exports = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
