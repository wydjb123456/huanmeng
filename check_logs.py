import paramiko
import sys

def main():
    hostname = '209.209.49.161'
    port = 57767
    username = 'root'
    password = 'MVa8GBlM4a7d'

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("Connecting to server...")
        client.connect(hostname, port=port, username=username, password=password, timeout=10)
        
        print("Connected! Fetching docker logs for ppt_poster_server...")
        # Check docker logs for the server container
        stdin, stdout, stderr = client.exec_command('docker logs --tail 100 ppt_poster_server')
        
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        
        if out:
            print("--- STDOUT ---")
            print(out)
        if err:
            print("--- STDERR ---")
            print(err)
            
        if not out and not err:
            print("No logs found or container doesn't exist.")
            # Let's list containers just in case
            stdin, stdout, stderr = client.exec_command('docker ps -a')
            print("--- DOCKER PS ---")
            print(stdout.read().decode('utf-8'))
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()