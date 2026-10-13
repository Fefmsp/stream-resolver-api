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
        console.log(`Lancement de Puppeteer sur Render pour résoudre : ${targetUrl}`);
        
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
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

        let capturedStreamUrl = null;

        page.on('request', (request) => {
            const url = request.url();
            if (url.includes('.m3u8') && !capturedStreamUrl) {
                capturedStreamUrl = url;
                console.log("Flux m3u8 intercepté avec succès :", capturedStreamUrl);
            }
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 5000));

        await browser.close();

        if (capturedStreamUrl) {
            return res.json({ success: true, url: capturedStreamUrl });
        } else {
            return res.status(404).json({ success: false, error: 'Impossible de capturer le flux m3u8 via Puppeteer' });
        }

    } catch (error) {
        if (browser) {
            await browser.close().catch(() => {});
        }
        console.error("Erreur Puppeteer sur Render :", error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de la résolution dynamique',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});