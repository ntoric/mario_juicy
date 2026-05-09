server {
    listen 80;
    server_name mario-adminer.ntoric.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8021;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_redirect off;
    }
}

# Add above in /etc/nginx/sites-available/mario-adminer
# Then run: sudo ln -s /etc/nginx/sites-available/mario-adminer /etc/nginx/sites-enabled/
# And: sudo nginx -t
# Finally: sudo systemctl reload nginx

# Certbot
# sudo apt install certbot python3-certbot-nginx
# sudo certbot --nginx -d mario-adminer.ntoric.com
# sudo certbot renew --dry-run
# sudo nginx -t
# sudo systemctl reload nginx