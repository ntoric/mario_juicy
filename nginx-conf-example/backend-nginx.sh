map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    server_name mario-api.ntoric.com;  # or your domain

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8020;


        # ESSENTIAL FOR WEBSOCKETS
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;


        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_redirect off;

        # INCREASE TIMEOUTS for long-running connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/mario-api.ntoric.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/mario-api.ntoric.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = mario-api.ntoric.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name mario-api.ntoric.com;
    return 404; # managed by Certbot


}

