#!/usr/bin/env node

// Quick migration runner - outputs SQL to run
const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '../supabase/migrations/20241029000005_fix_schema_mismatch.sql');
const sql = fs.readFileSync(migrationFile, 'utf-8');

console.log('='.repeat(80));
console.log('MIGRATION SQL - Copy and paste this into Supabase SQL Editor');
console.log('='.repeat(80));
console.log('');
console.log(sql);
console.log('');
console.log('='.repeat(80));
console.log('INSTRUCTIONS:');
console.log('1. Go to: https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to SQL Editor');
console.log('4. Click "New Query"');
console.log('5. Paste the SQL above');
console.log('6. Click "Run"');
console.log('='.repeat(80));

