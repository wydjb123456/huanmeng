const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('pm2 logs --lines 100 --nostream || docker ps || ls -la', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('error', (err) => {
  console.log('Connection Error:', err.message);
  // Try alternative password if first fails
  if (err.message.includes('Authentication')) {
     console.log('Trying alternative password...');
     const conn2 = new Client();
     conn2.on('ready', () => {
        conn2.exec('pm2 logs --lines 100 --nostream || docker ps || ls -la', (err, stream) => {
          if (err) throw err;
          stream.on('close', (code, signal) => { conn2.end(); })
                .on('data', data => console.log('STDOUT: ' + data))
                .stderr.on('data', data => console.log('STDERR: ' + data));
        });
     }).on('error', e => console.log('Alt error:', e.message))
       .connect({ host: '209.209.49.161', port: 57767, username: 'root', password: 'MVa8GBIM4a7d' });
  }
}).connect({
  host: '209.209.49.161',
  port: 57767,
  username: 'root',
  password: 'MVa8GBlM4a7d'
});
