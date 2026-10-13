FROM ghcr.io/puppeteer/puppeteer:22.15.0

WORKDIR /app

# Passer brièvement en root pour créer le dossier et donner les bons droits
USER root
RUN mkdir -p /app && chown -R pptruser:pptruser /app

# Revenir à l'utilisateur non-privilégié standard de l'image
USER pptruser

COPY --chown=pptruser:pptruser package*.json ./
RUN npm install

COPY --chown=pptruser:pptruser . .

EXPOSE 3000

CMD ["node", "server.js"]
