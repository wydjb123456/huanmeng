# 500 Internal Server Error 排查与修复指南

## 1. 服务器信息
根据您提供的服务器面板截图，当前排查目标服务器的信息如下：
- **操作系统**: Rocky_Linux_8_x64
- **公网 IP**: 209.209.49.161
- **内网 IP**: 10.23.175.2
- **SSH 端口**: 57767
- **SSH 账号**: root
- **SSH 密码**: MVa8GBlM4a7d

## 2. 连接服务器
打开本地终端，使用以下命令连接到服务器：
```bash
ssh -p 57767 root@209.209.49.161
```
*(提示输入密码时，复制并粘贴密码 `MVa8GBlM4a7d`)*

## 3. 常见报错排查步骤 (Rocky Linux 8 环境)

### 3.1 检查 Web 服务器错误日志
500 错误通常是由于后端程序异常或配置错误导致的，首先应该查看 Web 服务器的错误日志。
- **如果你使用的是 Nginx:**
  ```bash
  tail -f -n 100 /var/log/nginx/error.log
  ```
- **如果你使用的是 Apache (httpd):**
  ```bash
  tail -f -n 100 /var/log/httpd/error_log
  ```

### 3.2 检查应用程序日志
如果 Web 服务器只是作为反向代理，500 错误可能是由后端应用（如 PHP, Node.js, Python, Java 等）抛出的。
- **PHP-FPM:**
  ```bash
  tail -f -n 100 /var/log/php-fpm/error.log
  # 或查看 /var/log/php-fpm/www-error.log
  ```
- **Node.js (PM2):**
  ```bash
  pm2 logs
  ```
- **Java / Python / Go (Systemd 守护服务):**
  ```bash
  # 将 your-service 替换为你的实际服务名称
  journalctl -u your-service.service -n 100 -f
  ```

### 3.3 检查 SELinux 权限问题
Rocky Linux 8 默认开启了 SELinux，这可能会拦截 Web 服务器读取文件或进行网络请求，间接导致应用程序异常从而返回 500 错误。
- **临时关闭 SELinux 进行测试:**
  ```bash
  setenforce 0
  ```
  *注意：如果关闭后错误消失，说明是 SELinux 策略问题。排查完毕后建议使用 `setenforce 1` 重新开启，并配置正确的安全上下文。*
- **查看 SELinux 拦截日志:**
  ```bash
  cat /var/log/audit/audit.log | grep AVC
  ```

### 3.4 检查系统资源使用情况
服务器资源耗尽（如内存不足、磁盘写满）也会导致后端进程崩溃，从而引发 500 错误。
- **检查磁盘空间 (确保根目录没有达到 100%):**
  ```bash
  df -h
  ```
- **检查内存使用 (查看是否发生 OOM 内存溢出导致进程被杀):**
  ```bash
  free -h
  dmesg -T | grep -i oom
  ```
- **检查 CPU 和负载:**
  ```bash
  top
  ```

## 4. 常见原因总结与修复建议
1. **代码语法错误/致命异常:** 后端代码存在 Bug（如空指针、未定义变量等），需根据应用程序日志定位到具体代码行并修复。
2. **文件权限问题:** Web 服务器用户（如 `nginx` 或 `apache`）没有权限读取网站目录或写入缓存/日志目录。
   - 修复示例: `chown -R nginx:nginx /你的网站目录`
3. **数据库连接失败:** 应用无法连接到 MySQL/PostgreSQL/Redis，导致请求处理崩溃。
   - 检查数据库服务是否运行: `systemctl status mysqld`
4. **.htaccess / 伪静态配置错误:** 如果使用 Apache，根目录的 `.htaccess` 文件语法错误会直接导致 500 错误；Nginx 的 `rewrite` 规则死循环也会导致此类问题。
