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
let canvaWidth = 1000,
    canvaHeight = 800;
let maxVideoWidth = 800;
let maxVideoHeight = 600;

function preload() {
    soundFile = loadSound("../files/melody-loop-120-bpm.mp3"); // Carrega el fitxer d'àudio
    // Carrega l'icona de reproducció des del fitxer SVG
    playIcon = loadImage("../icons/play.svg");
    pauseIcon = loadImage("../icons/pause.svg");
}

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
    background("#40577A");

    // Obté l'espectre de freqüència
    let spectrum = fft.analyze();

    // Dibuixa l'espectrograma
    noStroke();

    // Obté l'amplitud mitjana del so
    let amplitude = fft.getEnergy(20, 200);
    // Calcula les noves dimensions de la captura de la webcam
    let newVideoWidth = map(amplitude, 0, 255, width / 2, maxVideoWidth);
    let newVideoHeight = map(amplitude, 0, 255, height / 3, maxVideoHeight);

    // Define las coordenadas y dimensiones donde deseas dibujar el espectrograma
    let xPosition = 0; // Posición en el eje x
    let yPosition = 0; // Posición en el eje y
    let spectrogramWidth = 800; // Ancho del espectrograma
    let spectrogramHeight = 400; // Altura del espectrograma

    
    let colors = ['#F1E3F3', '#C2BBF0', '#DB5461'];
    // Dibuja el espectrograma en la posición y tamaño especificados
    for (let i = 0; i < spectrum.length; i++) {
        let amp = spectrum[i];
        let y = map(amp, 0, 255, spectrogramHeight, 0); // Ajusta la altura al tamaño deseado
        let colorIndex = i % colors.length; // Selecciona un color de la paleta
    stroke(color(colors[colorIndex])); // Establece el color de la paleta para las líneas
    line(
        xPosition + i * (spectrogramWidth / spectrum.length),
        yPosition + y,
        xPosition + i * (spectrogramWidth / spectrum.length),
        yPosition + spectrogramHeight
    );
    }

    // Dibuixa el botó de reproducció
    drawPlayButton();

    video.loadPixels(); // Actualitzem la imatge de la webcam amb el filtre aplicat.
    video.updatePixels();
    let videoWidth = width;
    let videoHeight = height / 2; // Divide la altura del canvas en dos para la imagen de la webcam
    image(video, 0, height - newVideoHeight, newVideoWidth, newVideoHeight);
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
    lowPassFilter.freq(freq);
    applyEffects();
}

function updateResonance() {
    let resonance = resonanceSlider.value();
    lowPassFilter.res(resonance);
    applyEffects();
}

function applyEffects() {
    // Other effects...

    soundFile.disconnect(); // Disconnect previous connections
    soundFile.connect(lowPassFilter); // Connect sound to the low-pass filter
}

function updateDistortion() {
    distAmount = distortionSlider.value(); // Actualitza el valor de la distorsió
    console.log(distAmount);
    // Apply the distortion effect
    soundFile.disconnect(); // Disconnect previous connections
    soundFile.connect(distortion);
    distortion.process(soundFile, distAmount, 0); // Apply the distortion effect
}

function drawPlayButton() {
    if (isPlaying) {
        playButton.html("Pause");
    } else {
        playButton.html("Play");
    }
}
