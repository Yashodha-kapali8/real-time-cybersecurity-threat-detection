// Simple KDD CSV cleaner: unwrap quoted whole-line entries and prepend header
const fs = require('fs');
const path = require('path');

const IN = path.resolve(__dirname, '..', 'data', 'KDDtest.csv');
const OUT = path.resolve(__dirname, '..', 'data', 'KDDtest_cleaned.csv');

const header = [
  'duration','protocol_type','service','flag','src_bytes','dst_bytes','land','wrong_fragment','urgent','hot',
  'num_failed_logins','logged_in','num_compromised','root_shell','su_attempted','num_root','num_file_creations','num_shells','num_access_files','num_outbound_cmds',
  'is_host_login','is_guest_login','count','srv_count','serror_rate','srv_serror_rate','rerror_rate','srv_rerror_rate','same_srv_rate','diff_srv_rate',
  'srv_diff_host_rate','dst_host_count','dst_host_srv_count','dst_host_same_srv_rate','dst_host_diff_srv_rate','dst_host_same_src_port_rate','dst_host_srv_diff_host_rate','dst_host_serror_rate','dst_host_srv_serror_rate','dst_host_rerror_rate','dst_host_srv_rerror_rate',
  'label','difficulty'
].join(',');

console.log('Reading', IN);
const data = fs.readFileSync(IN, 'utf8');
const lines = data.split(/\r?\n/).filter(Boolean).map(l => {
  // unwrap if entire line is quoted
  if (l.startsWith('"') && l.endsWith('"')) {
    l = l.slice(1, -1);
  }
  return l;
});

console.log(`Found ${lines.length} rows`);
const out = [header].concat(lines).join('\n');
fs.writeFileSync(OUT, out, 'utf8');
console.log('Wrote cleaned CSV to', OUT);
