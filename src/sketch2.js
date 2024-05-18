// Variables globals per al fitxer de so i elements d'interfície
let soundFile; // Variable per emmagatzemar el fitxer de so
let playButton; // Botó de reproducció
let volumeSlider; // Slider per controlar el volum
let speedSlider; // Slider per controlar la velocitat de reproducció
let panSlider; // Slider per controlar la panoràmica (balanç estèreo)

// Variables per al filtre passabaixos (freqüència de tall i ressonància)
let cutoffFreqSlider; // Slider per controlar la freqüència de tall del filtre passabaixos
let resonanceSlider; // Slider per controlar la ressonància del filtre passabaixos

// Variable per a la distorsió
let distortionSlider; // Slider per controlar la quantitat de distorsió
let distortion; // Objecte de distorsió

let fft; // Variable per a l'objecte FFT per a l'anàlisi de freqüència

let isPlaying = false; // Variable per indicar si el so s'està reproduint
let distAmount = 0; // Quantitat inicial de distorsió
// Dimensions del canvas
let canvaWidth = 1000,
    canvaHeight = 800;

// Dimensions màximes del vídeo
let maxVideoWidth = 800,
    maxVideoHeight = 600;

function preload() {
    soundFile = loadSound("../files/melody-loop-120-bpm.mp3"); // Carrega el fitxer d'àudio
    // Carrega l'icona de reproducció des del fitxer SVG

}

// Funció per carregar els recursos abans de l'inicialització
function setup() {
    let canvas = createCanvas(canvaHeight, canvaWidth);
    canvas.parent("sketch-holder"); // Afegeix el canvas al div amb l'ID 'sketch-holder'

    // Botó de reproducció
    playButton = createButton("Play");
    playButton.size(55, 50);
    playButton.style("font", "1em sans-serif");

    playButton.style("cursor", "pointer");
    playButton.mousePressed(togglePlay);

    distortion = new p5.Distortion();

    lowPassFilter = new p5.Filter("lowpass");
    lowPassFilter.set(1000, 1); // Set initial cutoff frequency and resonance

    // Slider de volum
    volumeSlider = createSlider(0, 1, 0.5, 0.01);

    // Slider de velocitat de reproducció
    speedSlider = createSlider(0.5, 2, 1, 0.1);

    // Slider de panoràmica
    panSlider = createSlider(-1, 1, 0, 0.01);

    //Sliders de filtre passabaixos (Frequencia de tall i resonancia)
    cutoffFreqSlider = createSlider(20, 20000, 1000, 1);
    resonanceSlider = createSlider(0.1, 10, 1, 0.1);

    distortionSlider = createSlider(0, 1, 0, 0.01); // Slider de distorsió

    // Connecta els sliders als efectes d'àudio
    volumeSlider.input(updateVolume);
    speedSlider.input(updateSpeed);
    panSlider.input(updatePan);
    cutoffFreqSlider.input(updateCutoffFreq);
    resonanceSlider.input(updateResonance);
    distortionSlider.input(updateDistortion); // Connecta el slider de distorsió

    // Inicialitza l'objecte fft
    fft = new p5.FFT();

    video = createCapture(VIDEO); //Iniciem enregistrament de captura amb webcam.
    video.size(width, height);
    video.hide();
}

function draw() {
    background("#40577A"); // Pinta el fons del canvas amb un color blau fosc

    // Obté l'espectre de freqüència
    let spectrum = fft.analyze();

    // Dibuixa l'espectrograma
    noStroke();

    // Obté l'amplitud mitjana del so entre les freqüències 20 Hz i 200 Hz
    let amplitude = fft.getEnergy(20, 200);

    // Calcula les noves dimensions de la captura de la webcam basant-se en l'amplitud del so
    let newVideoWidth = map(amplitude, 0, 255, width / 2, maxVideoWidth);
    let newVideoHeight = map(amplitude, 0, 255, height / 3, maxVideoHeight);

    // Defineix les coordenades i dimensions per dibuixar l'espectrograma
    let xPosition = 0; // Posició en l'eix x
    let yPosition = 0; // Posició en l'eix y
    let spectrogramWidth = 800; // Amplada de l'espectrograma
    let spectrogramHeight = 400; // Alçada de l'espectrograma

    // Paleta de colors per a l'espectrograma
    let colors = ['#F1E3F3', '#C2BBF0', '#DB5461'];
    // Dibuixa l'espectrograma a la posició i mida especificades
    for (let i = 0; i < spectrum.length; i++) {
        let amp = spectrum[i];
        let y = map(amp, 0, 255, spectrogramHeight, 0); // Ajusta l'alçada al tamany desitjat
        let colorIndex = i % colors.length; // Selecciona un color de la paleta
        stroke(color(colors[colorIndex])); // Estableix el color de la línia
        line(
            xPosition + i * (spectrogramWidth / spectrum.length),
            yPosition + y,
            xPosition + i * (spectrogramWidth / spectrum.length),
            yPosition + spectrogramHeight
        );
    }

    // Dibuixa el botó de reproducció
    drawPlayButton();

    video.loadPixels(); // Carrega els píxels de la imatge de la webcam amb el filtre aplicat
    video.updatePixels(); // Actualitza els píxels
    let videoWidth = width; // Amplada del vídeo igual a l'amplada del canvas
    let videoHeight = height / 2; // Alçada del vídeo igual a la meitat de l'alçada del canvas
    image(video, 0, height - newVideoHeight, newVideoWidth, newVideoHeight); // Dibuixa el vídeo amb les noves dimensions
}

// Funció per canviar l'estat de reproducció del fitxer de so
function togglePlay() {
    if (soundFile.isPlaying()) {
        soundFile.stop(); // Atura el fitxer de so
        isPlaying = false; // Actualitza l'estat de reproducció a fals
    } else {
        soundFile.loop(); // Reprodueix el fitxer de so en bucle
        isPlaying = true;
    }
}

// Funció per actualitzar el volum del fitxer de so
function updateVolume() {
    let value = volumeSlider.value();// Obté el valor del slider de volum
    document.getElementById("volume-value").textContent = value; // Mostra el valor del volum
    soundFile.setVolume(value); // Estableix el volum del fitxer de so
}

// Funció per actualitzar la velocitat de reproducció del fitxer de so
function updateSpeed() {
    let value = speedSlider.value(); // Obté el valor del slider de velocitat
    document.getElementById("speed-value").textContent = value; // Mostra el valor de la velocitat
    soundFile.rate(value); // Estableix la velocitat de reproducció del fitxer de so
}

// Funció per actualitzar la panoràmica del fitxer de so
function updatePan() {
    let value = panSlider.value(); // Obté el valor del slider de panoràmica
    document.getElementById("pan-value").textContent = value; // Mostra el valor de la panoràmica
    soundFile.pan(value); // Estableix la panoràmica del fitxer de so
}

// Funció per actualitzar la freqüència de tall del filtre passabaixos
function updateCutoffFreq() {
    let value = cutoffFreqSlider.value(); // Obté el valor del slider de freqüència de tall
    document.getElementById("cutoff-freq-value").textContent = value; // Mostra el valor de la freqüència de tall
    lowPassFilter.freq(value); // Estableix la freqüència de tall del filtre passabaixos
    applyEffects(); // Aplica els efectes
}

// Funció per actualitzar la ressonància del filtre passabaixos
function updateResonance() {
    let value = resonanceSlider.value(); // Obté el valor del slider de ressonància
    document.getElementById("resonance-value").textContent = value; // Mostra el valor de la ressonància
    lowPassFilter.res(value); // Estableix la ressonància del filtre passabaixos
    applyEffects(); // Aplica els efectes
}

// Funció per actualitzar la quantitat de distorsió
function updateDistortion() {
    let value = distortionSlider.value(); // Obté el valor del slider de distorsió
    document.getElementById("distortion-value").textContent = value; // Mostra el valor de la distorsió
    distAmount = value; // Actualitza la quantitat de distorsió
    soundFile.disconnect(); // Desconnecta les connexions anteriors
    soundFile.connect(distortion); // Connecta el fitxer de so a la distorsió
    distortion.process(soundFile, distAmount, 0); // Aplica la distorsió
}

// Funció per aplicar els efectes d'àudio
function applyEffects() {
    soundFile.disconnect(); // Desconnecta les connexions anteriors
    soundFile.connect(lowPassFilter); // Connecta el fitxer de so al filtre passabaixos
}

// Dibuixa el botó de reproducció o pausa depenent de l'estat de reproducció
function drawPlayButton() {
    if (isPlaying) {
        playButton.html("Pause");
    } else {
        playButton.html("Play");
    }
}

