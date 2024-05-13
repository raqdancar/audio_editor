let soundFile;
let playButton;
let volumeSlider;
let speedSlider;
let panSlider;
let cutoffFreqSlider;
let resonanceSlider;
let distortionSlider; // Nou slider per controlar la distorsió

let fft;
let playIcon;
let pauseIcon;
let isPlaying = false;
let distAmount = 0;


function preload() {
    soundFile = loadSound("../files/melody-loop-120-bpm.mp3"); // Carrega el fitxer d'àudio
    // Carrega l'icona de reproducció des del fitxer SVG
    playIcon = loadImage('../icons/play.svg');
    pauseIcon = loadImage('../icons/pause.svg');
}

function setup() {
    let canvas = createCanvas(800, 400);
    canvas.parent("sketch-holder"); // Afegeix el canvas al div amb l'ID 'sketch-holder'

     // Botó de reproducció
     playButton = createButton("");
     playButton.size(50, 50);
     playButton.style('background-color', 'transparent');
     playButton.style('cursor', 'pointer');
     playButton.mousePressed(togglePlay);

    // Slider de volum
    
    volumeSlider = createSlider(0, 1, 0.5, 0.01);

    // Slider de velocitat de reproducció
    speedSlider = createSlider(0.5, 2, 1, 0.1);

    // Slider de panoràmica
    panSlider = createSlider(-1, 1, 0, 0.01);

    // Slider de freqüència de tall del filtre passabaixos
    cutoffFreqSlider = createSlider(20, 20000, 1000, 1);

    // Slider de ressonància del filtre passabaixos
    resonanceSlider = createSlider(0.1, 10, 1, 0.1);

    // Slider de distorsió
    distortionSlider = createSlider(0, 1, 0, 0.01);

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
    background(5);
    text("Velocitat:", 20, 80);
    text("Panoràmica:", 20, 130);
    text("Freqüència de tall:", 20, 180);
    text("Ressonància:", 20, 230);
    text("Distorsió:", 20, 280); // Etiqueta per al slider de distorsió

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
    soundFile.setVolume(volumeSlider.value());
}

function updateSpeed() {
    soundFile.rate(speedSlider.value());
}

function updatePan() {
    soundFile.pan(panSlider.value());
}

function updateCutoffFreq() {
    let freq = cutoffFreqSlider.value();
    let resonance = resonanceSlider.value();
    soundFile.setFilter("lowpass", freq, resonance);
}

function updateResonance() {
    let freq = cutoffFreqSlider.value();
    let resonance = resonanceSlider.value();
    soundFile.setFilter("lowpass", freq, resonance);
}

function updateDistortion() {

    distAmount = distortionSlider.value(); // Actualitza el valor de la distorsió
    console.log(distAmount)
    applyEffects(); // Aplica tots els efectes actualitzats

}

function applyEffects() {
    let freq = cutoffFreqSlider.value();
    let resonance = resonanceSlider.value();
    soundFile.setFilter("lowpass", freq, resonance); // Aplica el filtre passa baixos

    // Aplica l'efecte de distorsió
    let dryWet = 1; // Controla la quantitat de l'efecte aplicat al so original
    soundFile.setFilter('highpass'); // Aplica un filtre passa alt per evitar el so saturat a baixes freqüències
    soundFile.amp(1 - dryWet, 0.01); // Establim la part seca del so
    let distortion = new p5.Distortion(); // Crea un objecte de distorsió
    distortion.process(soundFile, distAmount); // Aplica la distorsió amb el valor de distAmount
}

function drawPlayButton() {
    let buttonX = playButton.position().x;
    let buttonY = playButton.position().y;

    // Dibuixa l'icona de reproducció o pausa segons l'estat actual
    if (isPlaying) {
        image(pauseIcon, buttonX, buttonY, 25, 25); // Dibuixa l'icona de pausa a la posició del botó
    } else {
        image(playIcon, buttonX, buttonY, 25, 25); // Dibuixa l'icona de reproducció a la posició del botó
    }
}