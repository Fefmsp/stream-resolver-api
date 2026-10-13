const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

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
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        let resolvedStreamUrl = null;

        await page.setRequestInterception(true);
        page.on('request', interceptedRequest => {
            const url = interceptedRequest.url();
            if ((url.includes('.m3u8') || url.includes('.mpd')) && !resolvedStreamUrl) {
                resolvedStreamUrl = url;
            }
            interceptedRequest.continue();
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        try {
            await page.waitForSelector('video, .vjs-big-play-button, #player, .play-button', { timeout: 5000 });
            await page.click('.vjs-big-play-button, #player, .play-button, video').catch(() => {});
        } catch (e) {
            // Ignorer si aucun bouton n'est trouvé
        }

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
