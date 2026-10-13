const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/api/resolve', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ error: 'Paramètre "url" manquant' });
    }

    // Ajout des options pour contourner la protection et récupérer directement le lien master.m3u8 ou index.m3u8
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";
    
    // Commande yt-dlp avec user-agent et referer
    const command = `yt-dlp --no-part --user-agent "${userAgent}" --referer "https://vidzy.cc/" -g "${targetUrl}"`;

    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Impossible de résoudre le flux avec yt-dlp',
                details: stderr || error.message 
            });
        }

        const streamUrl = stdout.trim().split('\n')[0];

        if (streamUrl && streamUrl.startsWith('http')) {
            return res.json({ success: true, url: streamUrl });
        } else {
            return res.status(404).json({ success: false, error: 'Aucun flux m3u8 valide trouvé' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Serveur yt-dlp démarré sur le port ${PORT}`);
});
