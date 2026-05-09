map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name mario-api.ntoric.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8020;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_redirect off;

        # Long connection timeout
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}


# Add above in /etc/nginx/sites-available/mario-api
# Then run: sudo ln -s /etc/nginx/sites-available/mario-api /etc/nginx/sites-enabled/
# sudo rm /etc/nginx/sites-enabled/default
# And: sudo nginx -t
# Finally: sudo systemctl reload nginx

# Certbot
# sudo apt install certbot python3-certbot-nginx
# sudo certbot --nginx -d mario-api.ntoric.com
#
# sudo certbot renew --dry-run
#
# sudo nginx -t
# sudo systemctl reload nginx