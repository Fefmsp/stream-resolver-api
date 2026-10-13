const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/api/resolve', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ error: 'Paramètre "url" manquant' });
    }

    let browser;
    try {
        // Lancer le navigateur Chromium via Playwright
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        let resolvedStreamUrl = null;

        // Intercepter les requêtes réseau pour capturer le m3u8 ou mpd
        page.on('request', request => {
            const url = request.url();
            if ((url.includes('.m3u8') || url.includes('.mpd')) && !resolvedStreamUrl) {
                resolvedStreamUrl = url;
            }
        });

        // Aller sur la page cible
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Tenter de cliquer sur le bouton de lecture de la page
        try {
            await page.click('.vjs-big-play-button, #player, .play-button, video', { timeout: 5000 });
        } catch (e) {
            // Ignorer si le bouton n'est pas trouvé
        }

        // Laisser un court délai pour capturer le flux déclenché
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
    console.log(`Serveur Playwright démarré sur le port ${PORT}`);
});
