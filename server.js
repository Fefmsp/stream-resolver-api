const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();

// Configuration CORS globale
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Range']
}));

app.options('*', cors());

const PORT = process.env.PORT || 3000;

// 1. Endpoint de résolution Puppeteer (pour récupérer le lien .m3u8 initial)
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

// 2. Endpoint Proxy (avec correction de la réécriture m3u8 pour éviter les boucles)
app.get('/api/proxy', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).send('Paramètre "url" manquant pour le proxy');
    }

    try {
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://vidzy.org/'
        };

        if (req.headers.range) {
            fetchHeaders['Range'] = req.headers.range;
        }

        const response = await fetch(videoUrl, { headers: fetchHeaders });

        const contentType = response.headers.get('content-type') || '';
        if (contentType) res.setHeader('Content-Type', contentType);
        
        const contentLength = response.headers.get('content-length');
        if (contentLength) res.setHeader('Content-Length', contentLength);

        const contentRange = response.headers.get('content-range');
        if (contentRange) res.setHeader('Content-Range', contentRange);

        if (response.status === 206) {
            res.status(206);
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        // Traitement sécurisé des fichiers .m3u8 (playlists et segments)
        if (contentType.includes('mpegurl') || videoUrl.includes('.m3u8')) {
            let m3u8Content = await response.text();
            const baseUrl = new URL(videoUrl);

            m3u8Content = m3u8Content.split('\n').map(line => {
                line = line.trim();
                // Ignorer les lignes vides ou les balises de métadonnées HLS (commençant par #)
                if (!line || line.startsWith('#')) {
                    return line;
                }

                try {
                    const absoluteSegmentUrl = new URL(line, baseUrl.href).toString();
                    // Éviter d'encapsuler si l'URL passe déjà par le proxy
                    if (absoluteSegmentUrl.includes('/api/proxy')) {
                        return line;
                    }
                    return `https://stream-resolver-api-1.onrender.com/api/proxy?url=${encodeURIComponent(absoluteSegmentUrl)}`;
                } catch (e) {
                    return line;
                }
            }).join('\n');

            return res.send(m3u8Content);
        }

        // Pour les segments vidéo binaires (.ts, .m4s, etc.)
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    } catch (err) {
        console.error("Erreur du proxy vidéo :", err);
        res.status(500).send('Erreur lors du proxy du flux distant');
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
