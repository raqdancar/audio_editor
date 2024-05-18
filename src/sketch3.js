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

let video; // Variable per a la imatge original
let fft; // Variable per a l'objecte FFT per a l'anàlisi de freqüència

let isPlaying = false;
let distAmount = 0;
let canvaWidth = 1000,
    canvaHeight = 800;
let maxVideoWidth = 800;
let maxVideoHeight = 600;
let negativeFilter = false, binarizedFilter = false, erodeFilter = false, posterizeFilter = false;
let activeFilters = new Set(); // Fem servir un conjunt per emmagatzemar els filtres actius
const matrix = [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]];
const mtx01 = [ [ -1, -1, -1 ], [ -1, 8, -1 ], [ -1, -1, -1 ] ];                // Matriu que defineix la màscara de convolució (Detecció de contorns)
const mtxtam = 3; // Dimensió de la màscara de convolució
let offset = 128;  

let rotationAngle = 0;
let rotationSpeed = 0.05;
let currentAngle = 0; // Variable global per emmagatzemar l'angle actual de rotació


function preload() {
    soundFile = loadSound("../files/melody-loop-120-bpm.mp3"); // Carrega el fitxer d'àudio
    // Carrega la icona de reproducció des del fitxer SVG
    playIcon = loadImage("../icons/play.svg");
    pauseIcon = loadImage("../icons/pause.svg");
}

function setup() {
    let canvas = createCanvas(canvaHeight, canvaWidth);
    const ctx = canvas.drawingContext;
    ctx.willReadFrequently = true;
    console.log(ctx.getContextAttributes());

    canvas.parent("sketch-holder"); // Afegeix el canvas al div amb l'ID 'sketch-holder'
    // Botó de reproducció
    playButton = createButton("Play");
    playButton.size(55, 50);
    playButton.style("font", "1em sans-serif");

    playButton.style("cursor", "pointer");
    playButton.mousePressed(togglePlay);

    distortion = new p5.Distortion();

    lowPassFilter = new p5.Filter("lowpass");
    lowPassFilter.set(1000, 1); // Estableix la freqüència de tall i ressonància inicial

    // Slider de volum
    volumeSlider = createSlider(0, 1, 0.5, 0.01);

    // Slider de velocitat de reproducció
    speedSlider = createSlider(0.5, 2, 1, 0.1);

    // Slider de panoràmica
    panSlider = createSlider(-1, 1, 0, 0.01);

    // Sliders de filtre passa-baixos (Freqüència de tall i ressonància)
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

    video = createCapture(VIDEO); // Iniciem enregistrament de captura amb webcam.
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

    // Defineix les coordenades i dimensions on vols dibuixar l'espectrograma
    let xPosition = 0; // Posició en l'eix x
    let yPosition = 0; // Posició en l'eix y
    let spectrogramWidth = 800; // Amplada de l'espectrograma
    let spectrogramHeight = 400; // Altura de l'espectrograma

    let colors = ['#F1E3F3', '#C2BBF0', '#DB5461'];
    // Dibuixa l'espectrograma en la posició i mida especificades
    for (let i = 0; i < spectrum.length; i++) {
        let amp = spectrum[i];
        let y = map(amp, 0, 255, spectrogramHeight, 0); // Ajusta l'altura a la mida desitjada
        let colorIndex = i % colors.length; // Selecciona un color de la paleta
        stroke(color(colors[colorIndex])); // Estableix el color de la paleta per a les línies
        line(
            xPosition + i * (spectrogramWidth / spectrum.length),
            yPosition + y,
            xPosition + i * (spectrogramWidth / spectrum.length),
            yPosition + spectrogramHeight
        );
    }

    // Dibuixa el botó de reproducció
    drawPlayButton();

    video.loadPixels(); // Actualitza la imatge de la webcam amb el filtre aplicat.
    video.updatePixels();
    let videoWidth = width;
    let videoHeight = height / 2; // Divideix l'altura del canvas en dos per a la imatge de la webcam

    applyActiveFilters(newVideoWidth, newVideoHeight); // Aplicar els efectes actius
    rotate(rotationAngle); // Apliquem rotació
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

function updateDistortion() {
    let value = distortionSlider.value();
    document.getElementById("distortion-value").textContent = value;
    distAmount = value;
    soundFile.disconnect();
    soundFile.connect(distortion);
    distortion.process(soundFile, distAmount, 0);
}

// Dibuixa el botó de reproducció o pausa depenent de l'estat de reproducció
function drawPlayButton() {
    if (isPlaying) {
        playButton.html("Pause");
    } else {
        playButton.html("Play");
    }
}

function negativeImage(img) {
    let negativeImage = img.get();
    negativeImage.filter(INVERT); // Apliquem la inversió negativa a la imatge.
    return negativeImage;
}

function applyBinarization(img) {
    let binerizedImage = img.get();
    binerizedImage.filter(THRESHOLD, 0.6); // Apliquem una binarització amb un llindar de 0.6 en una escala de 0-1.
    return binerizedImage;
}

function erodeImage(img) {
    let erodeImage = img.get();
    erodeImage.filter(ERODE); // Apliquem una binarització amb un llindar de 0.6 en una escala de 0-1.
    return erodeImage;
}

function posterizeImage(img) {
    let posterizeImage = img.get();
    posterizeImage.filter(POSTERIZE, 3); // Apliquem el filtre de posterització amb nivell 6.
    return posterizeImage;
}

// Funció per rotar la imatge cap a l'esquerra
function rotateImageLeft(img) {
    let rotatedImage = img.get(); // Obtenim una còpia de la imatge original
    rotatedImage.loadPixels(); // Carreguem els píxels de la imatge rotada

    // Definim l'angle de rotació per rotar la imatge cap a l'esquerra
    let rotationAngle = -HALF_PI; // Rotar 90 graus cap a l'esquerra

    // Apliquem la rotació a cada píxel de la imatge
    for (let y = 0; y < rotatedImage.height; y++) {
        for (let x = 0; x < rotatedImage.width; x++) {
            let rotatedX = cos(rotationAngle) * (x - rotatedImage.width / 2) - sin(rotationAngle) * (y - rotatedImage.height / 2) + rotatedImage.width / 2;
            let rotatedY = sin(rotationAngle) * (x - rotatedImage.width / 2) + cos(rotationAngle) * (y - rotatedImage.height / 2) + rotatedImage.height / 2;

            if (rotatedX >= 0 && rotatedX < rotatedImage.width && rotatedY >= 0 && rotatedY < rotatedImage.height) {
                let pixelIndex = (x + y * rotatedImage.width) * 4;
                let rotatedPixelIndex = (int(rotatedX) + int(rotatedY) * rotatedImage.width) * 4;

                // Copiem els components del píxel de la imatge original a la posició rotada
                rotatedImage.pixels[rotatedPixelIndex] = img.pixels[pixelIndex]; // Component vermell
                rotatedImage.pixels[rotatedPixelIndex + 1] = img.pixels[pixelIndex + 1]; // Component verd
                rotatedImage.pixels[rotatedPixelIndex + 2] = img.pixels[pixelIndex + 2]; // Component blau
                rotatedImage.pixels[rotatedPixelIndex + 3] = img.pixels[pixelIndex + 3]; // Component alfa
            }
        }
    }

    rotatedImage.updatePixels(); // Actualitzem la imatge rotada amb els nous valors de píxel
    return rotatedImage; // Retornem la imatge rotada
}
// Funció per rotar la imatge segons la direcció
function rotateImage(img, direction) {
    let rotatedImage = img.get(); // Obtenim una còpia de la imatge
    let centerX = rotatedImage.width / 2; // Centre de la imatge en l'eix X
    let centerY = rotatedImage.height / 2; // Centre de la imatge en l'eix Y

    push();
    translate(centerX, centerY); // Trasladem el punt d'origen al centre de la imatge

    switch (direction) {
        case "esquerra":
            rotationAngle -= 0.1; // Girem la imatge en sentit antihorari
            break;
        case "dreta":
            rotationAngle += 0.1; // Girem la imatge en sentit horari
            break;
        default:
            console.error("Direcció de rotació no vàlida");
            break;
    }

    rotate(currentAngle); // Apliquem la rotació amb l'angle actual
    image(rotatedImage, -centerX, -centerY); // Dibuixem la imatge rotada al nou origen
    pop();
}

// Funció per aplicar la convolució a una imatge
function detectEdges(image, newVideoWidth, newVideoHeight) {
    image.loadPixels(); // Carreguem els píxels de la imatge original

    let start = new Date(); // Almacenem el moment d'inici del loop per calcular el temps d'execució
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            let c = convolution(x, y); // Càlcul de la convolució espacial de cada píxel

            let position = (x + y * image.width) * 4; // Nova posició del píxel en la imatge
            image.pixels[position] = red(c); // Component vermell
            image.pixels[position + 1] = green(c); // Component verd
            image.pixels[position + 2] = blue(c); // Component blau
            image.pixels[position + 3] = 255; // Canal alfa, per defecte 255

        }
    }

    image.updatePixels(); // Actualitzem l'array de píxels

    let end = new Date(); // Almacenem el moment final del loop
    console.log("Temps d'execució =", end.getTime() - start.getTime(), "ms"); // Mostrem el temps d'execució

    return image;
}

// Funció que s'executa cada cop que es detecta una tecla polsada al teclat
function keyPressed() {
    switch (key.toLowerCase()) {
        case "a":
            activeFilters.add("negativeFilter"); // Activa el filtre negatiu
            break;
        case "s":
            activeFilters.add("binarizedFilter"); // Activa el filtre binaritzat
            break;
        case "d":
            activeFilters.add("erodeFilter"); // Activa el filtre d'erosió
            break;
        case "f":
            activeFilters.add("posterizeFilter"); // Activa el filtre de posterització
            break;
        case "p":
            activeFilters.add("contornos"); // Activa el filtre de contorns
            break;
        case "o":
            activeFilters.add("rotate-right"); // Activa la rotació a la dreta
            break;
        case "i":
            activeFilters.add("rotate-left"); // Activa la rotació a l'esquerra
            break;
        default:
            restoreLiveView(); // Restaura la vista original
            break;
    }
}

// Funció que s'executa cada cop que es detecta una tecla alliberada
function keyReleased() {
    switch (key.toLowerCase()) {
        case "a":
            activeFilters.delete("negativeFilter"); // Desactiva el filtre negatiu
            break;
        case "s":
            activeFilters.delete("binarizedFilter"); // Desactiva el filtre binaritzat
            break;
        case "d":
            activeFilters.delete("erodeFilter"); // Desactiva el filtre d'erosió
            break;
        case "f":
            activeFilters.delete("posterizeFilter"); // Desactiva el filtre de posterització
            break;
        case "p":
            activeFilters.delete("contornos"); // Desactiva el filtre de contorns
            break;
        case "o":
            activeFilters.delete("rotate-right"); // Desactiva la rotació a la dreta
            break;
        case "i":
            activeFilters.delete("rotate-left"); // Desactiva la rotació a l'esquerra
            break;
    }
    if (activeFilters.size === 0) {
        restoreLiveView(); // Restaura la vista original si no hi ha filtres actius
    }
}
// Funció per aplicar els filtres actius
function applyActiveFilters(newVideoWidth, newVideoHeight) {
    if (activeFilters.size === 0) { // Si no hi ha cap filtre actiu
        image(video, 0, height - newVideoHeight, newVideoWidth, newVideoHeight); // Dibuixa la imatge de la webcam sense filtres
    } else { // Si hi ha filtres actius
        let filteredImage = video.get(); // Copia la imatge original de la webcam
        for (let filter of activeFilters) {
            switch (filter) {
                case "negativeFilter":
                    filteredImage = negativeImage(filteredImage); // Aplica el filtre negatiu
                    break;
                case "binarizedFilter":
                    filteredImage = applyBinarization(filteredImage); // Aplica el filtre binaritzat
                    break;
                case "erodeFilter":
                    filteredImage = erodeImage(filteredImage); // Aplica el filtre d'erosió
                    break;
                case "posterizeFilter":
                    filteredImage = posterizeImage(filteredImage); // Aplica el filtre de posterització
                    break;
                case "contornos":
                    filteredImage = detectEdges(filteredImage, newVideoWidth, newVideoHeight); // Aplica el filtre de contorns
                    break;
                case "rotate-right":
                    rotateImage(filteredImage, "dreta"); // Rota la imatge a la dreta
                    break;
                case "rotate-left":
                    filteredImage = rotateImageLeft(filteredImage); // Rota la imatge a l'esquerra
                    break;
            }
            image(filteredImage, 0, height - newVideoHeight, newVideoWidth, newVideoHeight); // Dibuixa la imatge processada amb els filtres aplicats
        }
    }
}

// Funció per calcular la convolució d'un píxel
function convolution(x, y) {
    let resultado_r = 0.0; // Inicialitzem el resultat del component vermell
    let resultado_g = 0.0; // Inicialitzem el resultat del component verd
    let resultado_b = 0.0; // Inicialitzem el resultat del component blau
    
    const half = Math.floor(mtxtam / 2); // Calculem la meitat de la mida de la matriu de convolució

    const videoPixels = video.pixels; // Almacenem una referència a video.pixels per evitar múltiples accessos en cada iteració del bucle

    // Iterem per cada fila de la matriu de convolució
    for (let i = 0; i < mtxtam; i++) {
        const xstart = x - half; // Calculem l'inici de la regió d'interès en x
        const ystart = y - half + i; // Calculem l'inici de la regió d'interès en y

        // Iterem per cada columna de la matriu de convolució
        for (let j = 0; j < mtxtam; j++) {
            const xloc = xstart + j; // Calculem la coordenada x local
            const yloc = ystart; // Calculem la coordenada y local
            let loc = (xloc + video.width * yloc) * 4; // Calculem la posició del píxel en l'array de píxels

            loc = constrain(loc, 0, videoPixels.length - 1); // Ens assegurem que la posició del píxel sigui vàlida

            const factor = mtx01[i][j]; // Almacenem el factor de la matriu de convolució

            // Calculem la contribució de cada component del píxel
            resultado_r += videoPixels[loc] * factor;
            resultado_g += videoPixels[loc + 1] * factor;
            resultado_b += videoPixels[loc + 2] * factor;
        }
    }

    // Afegim l'offset als resultats
    resultado_r += offset;
    resultado_g += offset;
    resultado_b += offset;

    // Ens assegurem que els resultats estiguin dins del rang vàlid [0, 255]
    resultado_r = constrain(resultado_r, 0, 255);
    resultado_g = constrain(resultado_g, 0, 255);
    resultado_b = constrain(resultado_b, 0, 255);

    // Retornem el color resultant
    return color(resultado_r, resultado_g, resultado_b);
}