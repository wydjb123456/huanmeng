const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

(async () => {
  try {
    console.log('Connecting to server...');
    await ssh.connect({
      host: '209.209.49.161',
      port: 57767,
      username: 'root',
      password: 'MVa8GBlM4a7d',
    });
    console.log('Connected!');

    console.log('Executing deployment commands...');
    const result = await ssh.execCommand(`
      cd /www/huanmeng || { echo "Directory not found"; exit 1; }
      git reset --hard HEAD
      git clean -fd
      git pull origin main
      cd server
      npm install
      npx prisma generate
      npm run build
      pm2 restart huanmeng || pm2 start dist/main.js --name huanmeng
      cd ../client
      npm install
      npm run build
    `);
    
    console.log('STDOUT: ' + result.stdout);
    if (result.stderr) {
      console.error('STDERR: ' + result.stderr);
    }
    
    console.log('Deployment successful!');
  } catch (error) {
    console.error('Deployment failed:', error);
  } finally {
    ssh.dispose();
  }
})();
