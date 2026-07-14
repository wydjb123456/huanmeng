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
        
        commands = [
            "sed -i 's/return { userId: payload.sub/return { userId: payload.sub || payload.id/' /www/huanmeng/server/src/auth/jwt.strategy.ts",
            "cd /www/huanmeng/server && npm run build",
            "pm2 restart huanmeng-api"
        ]
        
        for cmd in commands:
            print(f"\n=== Running: {cmd} ===")
            stdin, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode('utf-8').strip()
            err = stderr.read().decode('utf-8').strip()
            if out:
                print(out)
            if err:
                print(f"Error: {err}")
                
    except Exception as e:
        print(f"Connection Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()