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

let isPlaying = false; // Variable per indicar si la reproducció està en marxa
let distAmount = 0; // Variable per emmagatzemar la quantitat de distorsió
let canvaWidth = 1000, // Amplada del canvas
    canvaHeight = 800; // Alçada del canvas
let maxVideoWidth = 800; // Amplada màxima del vídeo
let maxVideoHeight = 600; // Alçada màxima del vídeo
let negativeFilter = false, // Variable per indicar si el filtre negatiu està actiu
    binarizedFilter = false, // Variable per indicar si el filtre binaritzat està actiu
    erodeFilter = false, // Variable per indicar si el filtre d'erosió està actiu
    posterizeFilter = false; // Variable per indicar si el filtre de posterització està actiu
let activeFilters = new Set(); // Utilitzem un conjunt per emmagatzemar els filtres actius

const matrix = [
    [-1, -1, -1],
    [-1, 8, -1],
    [-1, -1, -1],
]; // Matriu que defineix la màscara de convolució (detecció de contorns)

const mtx01 = [
    [-1, -1, -1],
    [-1, 8, -1],
    [-1, -1, -1],
]; // Matriu que defineix la màscara de convolució (detecció de contorns)

const mtxtam = 3; // Dimensió de la màscara de convolució
let offset = 128; // Valor d'offset per ajustar el resultat de la convolució

const matrixsize = 3; // Dimensió de la màscara de convolució

let rotationAngle = 0; // Angle de rotació inicial
let rotationSpeed = 0.05; // Velocitat de rotació
let currentAngle = 0; // Variable global per emmagatzemar l'angle actual de rotació
let reverb; // Variable per emmagatzemar l'efecte de reverberació

function preload() {
    soundFile = loadSound("../files/melody-loop-120-bpm.mp3"); // Carrega el fitxer d'àudio
    playIcon = loadImage("../icons/play.svg"); // Carrega la icona de reproducció des del fitxer SVG
    pauseIcon = loadImage("../icons/pause.svg"); // Carrega la icona de pausa des del fitxer SVG
}

function setup() {
    let canvas = createCanvas(canvaHeight, canvaWidth); // Crea un canvas amb les dimensions especificades
    const ctx = canvas.drawingContext; // Obté el context de dibuix del canvas
    ctx.willReadFrequently = true; // Habilita la lectura freqüent del context
    console.log(ctx.getContextAttributes()); // Mostra els atributs del context al console.log

    canvas.parent("sketch-holder"); // Afegeix el canvas al div amb l'ID 'sketch-holder'

    // Botó de reproducció
    playButton = createButton("Play"); // Crea un botó de reproducció
    playButton.size(55, 50); // Defineix la mida del botó
    playButton.style("font", "1em sans-serif"); // Estableix el tipus de lletra i la mida

    playButton.style("cursor", "pointer"); // Canvia el cursor quan es passa per sobre del botó
    playButton.mousePressed(togglePlay); // Assigna la funció togglePlay quan es prem el botó

    distortion = new p5.Distortion(); // Crea un efecte de distorsió
    reverb = new p5.Reverb(); // Crea un efecte de reverberació

    lowPassFilter = new p5.Filter("lowpass"); // Crea un filtre passa-baixos
    lowPassFilter.set(1000, 1); // Estableix la freqüència de tall inicial i la ressonància

    // Slider de volum
    volumeSlider = createSlider(0, 1, 0.5, 0.01); // Crea un slider per ajustar el volum

    // Slider de velocitat de reproducció
    speedSlider = createSlider(0.5, 2, 1, 0.1); // Crea un slider per ajustar la velocitat de reproducció

    // Slider de panoràmica
    panSlider = createSlider(-1, 1, 0, 0.01); // Crea un slider per ajustar la panoràmica

    // Sliders de filtre passa-baixos (Frequència de tall i ressonància)
    cutoffFreqSlider = createSlider(20, 20000, 1000, 1); // Crea un slider per ajustar la freqüència de tall
    resonanceSlider = createSlider(0.1, 10, 1, 0.1); // Crea un slider per ajustar la ressonància

    distortionSlider = createSlider(0, 1, 0, 0.01); // Slider de distorsió
    reverbSlider = createSlider(0, 1, 0, 0.01); // Slider de reverberació

    // Connecta els sliders als efectes d'àudio
    volumeSlider.input(updateVolume); // Connecta el slider de volum a la funció updateVolume
    speedSlider.input(updateSpeed); // Connecta el slider de velocitat a la funció updateSpeed
    panSlider.input(updatePan); // Connecta el slider de panoràmica a la funció updatePan
    cutoffFreqSlider.input(updateCutoffFreq); // Connecta el slider de freqüència de tall a la funció updateCutoffFreq
    resonanceSlider.input(updateResonance); // Connecta el slider de ressonància a la funció updateResonance
    distortionSlider.input(updateDistortion); // Connecta el slider de distorsió a la funció updateDistortion
    reverbSlider.input(updateReverb); // Connecta el slider de reverberació a la funció updateReverb

    // Inicialitza l'objecte FFT
    fft = new p5.FFT(); // Crea un objecte per l'anàlisi de Fourier

    video = createCapture(VIDEO); // Inicia la captura de vídeo amb la webcam
    video.size(width, height); // Defineix la mida del vídeo
    video.hide(); // Amaga el vídeo original
}

function draw() {
    background(getEnergy() * 255); // Estableix el color de fons basat en l'energia del so

    // Obté l'espectre de freqüència
    let spectrum = fft.analyze();

    // Dibuixa l'espectrograma
    noStroke(); // No utilitza cap traçat

    // Obté l'amplitud mitjana del so
    let amplitude = fft.getEnergy(20, 200); // Obté l'amplitud de les freqüències entre 20 i 200 Hz
    // Calcula les noves dimensions de la captura de la webcam
    let newVideoWidth = map(amplitude, 0, 255, width / 2, maxVideoWidth); // Mapeja l'amplitud a la nova amplada del vídeo
    let newVideoHeight = map(amplitude, 0, 255, height / 3, maxVideoHeight); // Mapeja l'amplitud a la nova alçada del vídeo

    // Defineix les coordenades i dimensions on vols dibuixar l'espectrograma
    let xPosition = 0; // Posició en l'eix x
    let yPosition = 0; // Posició en l'eix y
    let spectrogramWidth = 800; // Amplada de l'espectrograma
    let spectrogramHeight = 400; // Alçada de l'espectrograma

    let colors = ["#F1E3F3", "#C2BBF0", "#DB5461"]; // Paleta de colors per a l'espectrograma
    // Dibuixa l'espectrograma a la posició i mida especificades
    for (let i = 0; i < spectrum.length; i++) {
        let amp = spectrum[i];
        let y = map(amp, 0, 255, spectrogramHeight, 0); // Ajusta l'alçada a la mida desitjada
        let colorIndex = i % colors.length; // Selecciona un color de la paleta
        stroke(color(colors[colorIndex])); // Estableix el color de la paleta per a les línies
        line(
            xPosition + i * (spectrogramWidth / spectrum.length), // Coordenada x inicial de la línia
            yPosition + y, // Coordenada y inicial de la línia
            xPosition + i * (spectrogramWidth / spectrum.length), // Coordenada x final de la línia (mateixa que l'inicial per crear una línia vertical)
            yPosition + spectrogramHeight // Coordenada y final de la línia
        );
    }

    // Dibuixa el botó de reproducció
    drawPlayButton();

    video.loadPixels(); // Actualitza els píxels de la captura de vídeo
    video.updatePixels();
    let videoWidth = width;
    let videoHeight = height / 2; // Divideix l'alçada del canvas per dos per a la imatge de la webcam

    applyActiveFilters(newVideoWidth, newVideoHeight); // Aplica els efectes actius
    rotate(rotationAngle); // Aplica rotació
}

function togglePlay() {
    if (soundFile.isPlaying()) { // Si l'arxiu de so s'està reproduint
        soundFile.stop(); // Atura la reproducció
        isPlaying = false; // Actualitza l'estat de reproducció a fals
    } else {
        soundFile.loop(); // Reprodueix l'arxiu de so en bucle
        isPlaying = true; // Actualitza l'estat de reproducció a cert
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

function updateReverb() {
    reverbValue = reverbSlider.value(); // Actualitza el valor de la distorsió
    console.log(reverbValue);
    // Apply the distortion effect
    soundFile.disconnect(); // Disconnect previous connections
    soundFile.connect(reverb);
    reverb.process(soundFile, reverbValue, 0.2); // Apply the distortion effect
    document.getElementById("reverb-value").textContent = reverbValue;
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
    binerizedImage.filter(THRESHOLD, 0.6 / 1); // Apliquem una binarització amb un llindar de 0.6 en una escala de 0-1.
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
function keyPressed() {
    // Funció que s'executa cada cop que es detecta una tecla polsada al teclat.

    switch (key.toLowerCase()) { // Converteix la tecla polsada a minúscules
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
            activeFilters.add("rotate-right"); // Activa la rotació cap a la dreta
            break;
        case "i":
            activeFilters.add("rotate-left"); // Activa la rotació cap a l'esquerra
            break;
        case "arrowleft":
            activeFilters.add("move-left"); // Activa el moviment cap a l'esquerra
            break;
        case "arrowright":
            activeFilters.add("move-right"); // Activa el moviment cap a la dreta
            break;
        case "arrowup":
            activeFilters.add("move-up"); // Activa el moviment cap amunt
            break;
        case "arrowdown":
            activeFilters.add("move-down"); // Activa el moviment cap avall
            break;
        default:
            break;
    }
}

function keyReleased() {
    switch (key.toLowerCase()) { // Converteix la tecla alliberada a minúscules
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
            activeFilters.delete("rotate-right"); // Desactiva la rotació cap a la dreta
            break;
        case "i":
            activeFilters.delete("rotate-left"); // Desactiva la rotació cap a l'esquerra
            break;
        case "arrowleft":
            activeFilters.delete("move-left"); // Desactiva el moviment cap a l'esquerra
            break;
        case "arrowright":
            activeFilters.delete("move-right"); // Desactiva el moviment cap a la dreta
            break;
        case "arrowup":
            activeFilters.delete("move-up"); // Desactiva el moviment cap amunt
            break;
        case "arrowdown":
            activeFilters.delete("move-down"); // Desactiva el moviment cap avall
            break;
    }
}
function applyActiveFilters(newVideoWidth, newVideoHeight) {
    if (activeFilters.size === 0) {
        // Si no s'ha activat cap filtre específic, es mostra la imatge de la webcam sense filtres
        image(video, 0, height - newVideoHeight, newVideoWidth, newVideoHeight);
    } else {
        // Si s'han activat filtres específics, s'apliquen successivament a la imatge de la webcam
        let filteredImage = video.get(); // Es fa una còpia de la imatge original de la webcam
        for (let filter of activeFilters) {
            switch (filter) {
                case "negativeFilter":
                    filteredImage = negativeImage(filteredImage); // S'aplica el filtre negatiu
                    break;
                case "binarizedFilter":
                    filteredImage = applyBinarization(filteredImage); // S'aplica el filtre binaritzat
                    break;
                case "erodeFilter":
                    filteredImage = erodeImage(filteredImage); // S'aplica el filtre d'erosió
                    break;
                case "posterizeFilter":
                    filteredImage = posterizeImage(filteredImage); // S'aplica el filtre de posterització
                    break;
                case "contornos":
                    filteredImage = detectEdges(filteredImage, newVideoWidth, newVideoHeight); // S'aplica el filtre de detecció de contorns
                    break;
                case "rotate-right":
                    // Implementació pendent de la rotació cap a la dreta
                    break;
                case "rotate-left":
                    // Implementació pendent de la rotació cap a l'esquerra
                    break;
                case "move-up":
                    // Es defineix una nova posició per a la imatge cap amunt
                    let newY = height - newVideoHeight - 0.0001;
                    newY = constrain(newY, 0, height - newVideoHeight); // Es garanteix que no surti dels límits del canvas
                    image(filteredImage, 0, height - newY, newVideoWidth, newVideoHeight);
                    break;
                case "move-down":
                    // Es defineix una nova posició per a la imatge cap avall
                    let newYDown = height - newVideoHeight + 0.0001;
                    newYDown = constrain(newYDown, 0, height - newVideoHeight); // Es garanteix que no surti dels límits del canvas
                    image(filteredImage, 0, height - newYDown, newVideoWidth, newVideoHeight);
                    break;
                case "move-right":
                    // Es defineix una nova posició per a la imatge cap a la dreta
                    let newXRight = width - newVideoWidth + 1;
                    newXRight = constrain(newXRight, 0, width - newVideoWidth); // Es garanteix que no surti dels límits del canvas
                    image(filteredImage, newXRight, height - newVideoHeight, newVideoWidth, newVideoHeight);
                    break;
                case "move-left":
                    // Es defineix una nova posició per a la imatge cap a l'esquerra
                    let newXLeft = 1;
                    newXLeft = constrain(newXLeft, 0, width - newVideoWidth); // Es garanteix que no surti dels límits del canvas
                    image(filteredImage, newXLeft, height - newVideoHeight, newVideoWidth, newVideoHeight);
                    break;
            }
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

function getEnergy() {
    // Calcula l'espectre de freqüència de l'entrada de so actual
    let spectrum = fft.analyze();
    // Obté la mesura d'energia en un rang de freqüències específic (de baixes freqüències fins a freqüències mitges baixes)
    let energy = fft.getEnergy("bass", "lowMid");
    // Normalitza el valor de l'energia en un rang de 0 a 1
    let normalizedEnergy = map(energy, 0, 255, 0, 1);

    // Retorna el valor normalitzat de l'energia
    return normalizedEnergy;
}