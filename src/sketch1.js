let soundFile;
let playButton;
let volumeSlider;
let speedSlider;
let panSlider;

//Freqüència de tall i la ressonància d’un filtre passabaixos.
let cutoffFreqSlider;
let resonanceSlider;

//Distorsió:
let distortionSlider; // Nou slider per controlar la distorsió
let distortion;

let fft;
let playIcon;
let pauseIcon;
let isPlaying = false;
let distAmount = 0;

function preload() {
    soundFile = loadSound("../files/melody-loop-120-bpm.mp3"); // Carrega el fitxer d'àudio
    // Carrega l'icona de reproducció des del fitxer SVG
    playIcon = loadImage("../icons/play.svg");
    pauseIcon = loadImage("../icons/pause.svg");
}

function setup() {
    let canvas = createCanvas(800, 400);
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
}

function draw() {
    background("#40577A");
    // Obté l'espectre de freqüència
    let spectrum = fft.analyze();
    // Dibuixa l'espectrograma
    noStroke();

    for (let i = 0; i < spectrum.length; i++) {
        let amp = spectrum[i];
        let y = map(amp, 0, 255, height, 0);
        fill(255 - i, 255, 255);
        rect(i * (width / spectrum.length), y, width / spectrum.length, height - y);
    }
    // Dibuixa el botó de reproducció
    drawPlayButton();
}

function togglePlay() {
    if (soundFile.isPlaying()) {
        soundFile.stop();
        isPlaying = false; // Actualitza l'estat de reproducció
    } else {
        soundFile.loop();
        isPlaying = true; // Actualitza l'estat de reproducció
    }
}

function updateVolume() {
    let value = volumeSlider.value();
    document.getElementById("volume-value").textContent = value;
    soundFile.setVolume(value);
}

function updateSpeed() {
    let value = speedSlider.value();
    document.getElementById("speed-value").textContent = value;
    soundFile.rate(value);
}

function updatePan() {
    let value = panSlider.value();
    document.getElementById("pan-value").textContent = value;
    soundFile.pan(value);
}

function updateCutoffFreq() {
    let value = cutoffFreqSlider.value();
    document.getElementById("cutoff-freq-value").textContent = value;
    lowPassFilter.freq(value);
    applyEffects();
}

function updateResonance() {
    let value = resonanceSlider.value();
    document.getElementById("resonance-value").textContent = value;
    lowPassFilter.res(value);
    applyEffects();
}

function updateDistortion() {
    let value = distortionSlider.value();
    document.getElementById("distortion-value").textContent = value;
    distAmount = value;
    soundFile.disconnect();
    soundFile.connect(distortion);
    distortion.process(soundFile, distAmount, 0);
}

function applyEffects() {
    // Other effects...

    soundFile.disconnect(); // Disconnect previous connections
    soundFile.connect(lowPassFilter); // Connect sound to the low-pass filter
}

function drawPlayButton() {
    if (isPlaying) {
        playButton.html("Pause");
    } else {
        playButton.html("Play");
    }
}
