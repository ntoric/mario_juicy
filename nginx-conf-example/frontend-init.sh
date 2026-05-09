server {
    listen 80;
    server_name mario.ntoric.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3020;

        proxy_http_version 1.1;

        # Important for Next.js/WebSocket/HMR
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        proxy_redirect off;
    }
}


# Add above in /etc/nginx/sites-available/mario-frontend
# Then run: sudo ln -s /etc/nginx/sites-available/mario-frontend /etc/nginx/sites-enabled/
# sudo rm /etc/nginx/sites-enabled/default
# And: sudo nginx -t
# Finally: sudo systemctl reload nginx

# Certbot
# sudo apt install certbot python3-certbot-nginx
# sudo certbot --nginx -d mario.ntoric.com
# sudo certbot renew --dry-run
# sudo nginx -t
# sudo systemctl reload nginx
