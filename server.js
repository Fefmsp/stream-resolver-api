<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Lecteur HLS & Résolveur Vidzy</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #121212;
            color: #ffffff;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        h1 {
            color: #ff4757;
        }
        .container {
            width: 100%;
            max-width: 800px;
            background: #1e1e1e;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        input[type="text"] {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            background: #2d2d2d;
            border: 1px solid #444;
            color: #fff;
            border-radius: 4px;
            box-sizing: border-box;
        }
        button {
            background-color: #ff4757;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover {
            background-color: #ff6b81;
        }
        .video-container {
            margin-top: 20px;
            position: relative;
            width: 100%;
            padding-top: 56.25%;
            background: #000;
            border-radius: 4px;
            overflow: hidden;
        }
        video {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        #status {
            margin-top: 15px;
            font-style: italic;
            color: #a4b0be;
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>Testeur de Flux HLS - Vidzy</h1>
        
        <label for="targetUrl">URL de la page cible :</label>
        <input type="text" id="targetUrl" value="https://vidzy.org/serie/456/1/1/vf?autoplay=1">

        <label for="apiUrl">URL de votre Backend (API Node.js) :</label>
        <input type="text" id="apiUrl" value="https://stream-resolver-api-1.onrender.com/api/resolve">

        <button onclick="lancerResolutionEtLecture()">Résoudre et Lire</button>

        <div id="status">En attente d'action...</div>

        <div class="video-container">
            <video id="videoPlayer" controls autoplay></video>
        </div>
    </div>

    <script>
        const video = document.getElementById('videoPlayer');
        let hls;

        async function lancerResolutionEtLecture() {
            const targetUrl = document.getElementById('targetUrl').value;
            const apiUrl = document.getElementById('apiUrl').value;
            const statusDiv = document.getElementById('status');

            if (!targetUrl || !apiUrl) {
                alert("Veuillez remplir tous les champs.");
                return;
            }

            statusDiv.textContent = "Résolution du flux en cours via Render (Puppeteer)... (Veuillez patienter)";

            try {
                const response = await fetch(`${apiUrl}?url=${encodeURIComponent(targetUrl)}`);
                const data = await response.json();

                if (data.success && data.url) {
                    statusDiv.textContent = "Flux trouvé ! Chargement dans le lecteur HLS...";
                    console.log("Flux m3u8 récupéré :", data.url);
                    chargerFluxHls(data.url);
                } else {
                    statusDiv.textContent = "Erreur : " + (data.error || "Flux introuvable.");
                }
            } catch (error) {
                statusDiv.textContent = "Erreur de connexion avec le serveur backend : " + error.message;
                console.error(error);
            }
        }

        function chargerFluxHls(urlFlux) {
            const statusDiv = document.getElementById('status');

            if (hls) {
                hls.destroy();
            }

            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(urlFlux);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    statusDiv.textContent = "Lecture en cours...";
                    video.play().catch(e => {
                        console.log("Autoplay bloqué par le navigateur :", e);
                        statusDiv.textContent = "Lecture prête. Cliquez sur play sur la vidéo.";
                    });
                });
                hls.on(Hls.Events.ERROR, function(event, data) {
                    console.error("Erreur HLS.js :", data);
                    if (data.fatal) {
                        statusDiv.textContent = "Erreur fatale du lecteur HLS : " + data.type;
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = urlFlux;
                video.addEventListener('loadedmetadata', function() {
                    statusDiv.textContent = "Lecture en cours (natif)...";
                    video.play();
                });
            } else {
                statusDiv.textContent = "Votre navigateur ne supporte pas HLS.";
            }
        }
    </script>
</body>
</html>
