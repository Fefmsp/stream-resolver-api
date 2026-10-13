const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;
const express = require('express');
const cors = require('cors'); // <--- 1. Importer cors
const puppeteer = require('puppeteer');

const app = express();

app.use(cors()); // <--- 2. Activer CORS pour autoriser les requêtes externes

const PORT = process.env.PORT || 3000;

app.get('/api/resolve', async (req, res) => {
    // ... (reste de votre code inchangé)
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
app.get('/api/resolve', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ error: 'Paramètre "url" manquant' });
    }

    let browser;
    try {
        // Lancer un navigateur headless optimisé pour les serveurs
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        let resolvedStreamUrl = null;

        // Intercepter les requêtes réseau pour attraper le m3u8
        await page.setRequestInterception(true);
        page.on('request', interceptedRequest => {
            const url = interceptedRequest.url();
            if ((url.includes('.m3u8') || url.includes('.mpd')) && !resolvedStreamUrl) {
                resolvedStreamUrl = url;
            }
            interceptedRequest.continue();
        });

        // Aller sur la page cible
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Tenter de cliquer sur un bouton de lecture si présent
        try {
            await page.waitForSelector('video, .vjs-big-play-button, #player, .play-button', { timeout: 5000 });
            await page.click('.vjs-big-play-button, #player, .play-button, video').catch(() => {});
        } catch (e) {
            // Ignorer si aucun bouton n'est trouvé
        }

        // Attendre un court instant pour capturer le flux si déclenché par le clic
        await new Promise(resolve => setTimeout(resolve, 3000));

        await browser.close();

        if (resolvedStreamUrl) {
            return res.json({ success: true, url: resolvedStreamUrl });
        } else {
            return res.status(404).json({ success: false, error: 'Flux introuvable' });
        }

    } catch (error) {
        if (browser) await browser.close();
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
