// Variables globals per al fitxer de so i elements d'interfície
let soundFile;
let playButton;
let volumeSlider;
let speedSlider;
let panSlider;

// Freqüència de tall i la ressonància d’un filtre passabaixos
let cutoffFreqSlider;
let resonanceSlider;

// Distorsió
let distortionSlider;       // Nou slider per controlar la distorsió
let distortion; 

let fft;
let isPlaying = false;      // Estat de reproducció
let distAmount = 0;         // Quantitat inicial de distorsió


// Carrega el fitxer d'àudio
function preload() {
    soundFile = loadSound("../files/melody-loop-120-bpm.mp3");
}

function setup() {
    let canvas = createCanvas(800, 400);
    canvas.parent("sketch-holder");         // Afegeix el canvas al div amb l'ID 'sketch-holder'

    // Botó de reproducció
    playButton = createButton("Play");
    playButton.size(55, 50);
    playButton.style("font", "1em sans-serif");

    playButton.style("cursor", "pointer");
    playButton.mousePressed(togglePlay);    // Assigna la funció per canviar l'estat de reproducció

    distortion = new p5.Distortion();

    lowPassFilter = new p5.Filter("lowpass");
    lowPassFilter.set(1000, 1);  // Configura la freqüència de tall i la ressonància inicial

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

    // Inicialitza l'objecte fft per a l'anàlisi de freqüència
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

// Canvia l'estat de reproducció del fitxer de so
function togglePlay() {
    if (soundFile.isPlaying()) { //Comprova si el audio s'esta reproduïnt
        soundFile.stop();
        isPlaying = false; // Actualitza l'estat de reproducció
    } else {
        soundFile.loop();
        isPlaying = true; // Actualitza l'estat de reproducció
    }
}

// Actualitza el volum del fitxer de so
function updateVolume() {
    let value = volumeSlider.value();
    document.getElementById("volume-value").textContent = value;  // Mostra el valor del volum
    soundFile.setVolume(value);
}

// Actualitza la velocitat de reproducció del fitxer de so
function updateSpeed() {
    let value = speedSlider.value();
    document.getElementById("speed-value").textContent = value; // Mostra el valor de la velocitat
    soundFile.rate(value);
}

// Actualitza la panoràmica del fitxer de so
function updatePan() {
    let value = panSlider.value();
    document.getElementById("pan-value").textContent = value; // Mostra el valor de la panoràmica
    soundFile.pan(value);
}

// Actualitza la freqüència de tall del filtre passabaixos
function updateCutoffFreq() {
    let value = cutoffFreqSlider.value();
    document.getElementById("cutoff-freq-value").textContent = value; // Mostra el valor de la freqüència de tall
    lowPassFilter.freq(value);
    applyEffects(); // Aplica els efectes
}

// Actualitza la ressonància del filtre passabaixos
function updateResonance() {
    let value = resonanceSlider.value();
    document.getElementById("resonance-value").textContent = value; // Mostra el valor de la ressonància
    lowPassFilter.res(value);
    applyEffects();
}

// Actualitza la quantitat de distorsió
function updateDistortion() {
    let value = distortionSlider.value();
    document.getElementById("distortion-value").textContent = value; // Mostra el valor de la distorsió
    distAmount = value;
    soundFile.disconnect(); // Desconnecta les connexions anteriors
    soundFile.connect(distortion); // Connecta el fitxer de so a la distorsió
    distortion.process(soundFile, distAmount, 0); // Aplica la distorsió
}

// Aplica els efectes d'àudio
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
