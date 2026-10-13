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

    // L'option -g (ou --get-url) demande à yt-dlp de retourner uniquement l'URL directe du flux
    const command = `yt-dlp -g "${targetUrl}"`;

    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Impossible de résoudre le flux avec yt-dlp',
                details: stderr || error.message 
            });
        }

        // yt-dlp peut retourner plusieurs lignes (ex: audio et vidéo séparés), on prend la première (le flux principal)
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
