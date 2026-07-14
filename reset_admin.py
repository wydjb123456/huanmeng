import paramiko

def main():
    hostname = '209.209.49.161'
    port = 57767
    username = 'root'
    password = 'MVa8GBlM4a7d'

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, port=port, username=username, password=password, timeout=10)
        
        node_script = """
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const plainPassword = 'admin123';
  const hashed = await bcrypt.hash(plainPassword, 10);
  
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    await prisma.user.update({
      where: { username },
      data: { password: hashed, role: 'ADMIN' }
    });
    console.log('SUCCESS: Admin password reset to admin123');
  } else {
    await prisma.user.create({
      data: { username, password: hashed, role: 'ADMIN' }
    });
    console.log('SUCCESS: Admin user created with password admin123');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
"""
        
        # Write node script to file on server
        client.exec_command("cat << 'EOF' > /www/huanmeng/server/reset_admin.js\n" + node_script + "\nEOF\n")
        
        # Run node script
        stdin, stdout, stderr = client.exec_command("cd /www/huanmeng/server && node reset_admin.js")
        
        out = stdout.read().decode('utf-8').strip()
        err = stderr.read().decode('utf-8').strip()
        
        print("--- OUT ---")
        print(out)
        print("--- ERR ---")
        print(err)
        
    except Exception as e:
        print(f"Connection Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()