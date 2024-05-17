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
let video; // variable para la imagen original

let fft;
let playIcon;
let pauseIcon;
let isPlaying = false;
let distAmount = 0;
let canvaWidth = 1000,
    canvaHeight = 800;
let maxVideoWidth = 800;
let maxVideoHeight = 600;
let negativeFilter = false,
    binarizedFilter = false,
    erodeFilter = false,
    posterizeFilter = false;
let activeFilters = new Set(); // Usamos un conjunto para almacenar los filtros activos
const matrix = [
    [-1, -1, -1],
    [-1, 8, -1],
    [-1, -1, -1],
];
const mtx01 = [
    [-1, -1, -1],
    [-1, 8, -1],
    [-1, -1, -1],
]; // Matriz que define la máscara de convolución (Detección de contornos)
const mtxtam = 3; // Dimensión de la máscara de convolución
let offset = 128;
// Dimensión de la máscara de convolución
const matrixsize = 3;

let rotationAngle = 0;
let rotationSpeed = 0.05;
let currentAngle = 0; // Variable global para almacenar el ángulo actual de rotación
let reverb;

function preload() {
    soundFile = loadSound("../files/melody-loop-120-bpm.mp3"); // Carrega el fitxer d'àudio
    // Carrega l'icona de reproducció des del fitxer SVG
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
    reverb = new p5.Reverb();

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
    reverbSlider = createSlider(0, 1, 0, 0.01); // Slider de distorsió

    // Connecta els sliders als efectes d'àudio
    volumeSlider.input(updateVolume);
    speedSlider.input(updateSpeed);
    panSlider.input(updatePan);
    cutoffFreqSlider.input(updateCutoffFreq);
    resonanceSlider.input(updateResonance);
    distortionSlider.input(updateDistortion); // Connecta el slider de distorsió
    reverbSlider.input(updateReverb); // Connecta el slider de distorsió

    // Inicialitza l'objecte fft
    fft = new p5.FFT();

    video = createCapture(VIDEO); //Iniciem enregistrament de captura amb webcam.
    video.size(width, height);
    video.hide();
}

function draw() {
    background(getEnergy() * 255);

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

    let colors = ["#F1E3F3", "#C2BBF0", "#DB5461"];
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

    applyActiveFilters(newVideoWidth, newVideoHeight); // Aplicar los efectos activos
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

function updateReverb() {
    reverbValue = reverbSlider.value(); // Actualitza el valor de la distorsió
    console.log(reverbValue);
    // Apply the distortion effect
    soundFile.disconnect(); // Disconnect previous connections
    soundFile.connect(reverb);
    reverb.process(soundFile, reverbValue, 0.2); // Apply the distortion effect
}

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

function rotateImageLeft(img) {
    let rotatedImage = img.get(); // Get a copy of the original image
    rotatedImage.loadPixels(); // Load the pixels of the rotated image

    // Define the rotation angle for rotating the image to the left
    let rotationAngle = -HALF_PI; // Rotate 90 degrees to the left

    // Apply rotation to each pixel of the image
    for (let y = 0; y < rotatedImage.height; y++) {
        for (let x = 0; x < rotatedImage.width; x++) {
            let rotatedX =
                cos(rotationAngle) * (x - rotatedImage.width / 2) -
                sin(rotationAngle) * (y - rotatedImage.height / 2) +
                rotatedImage.width / 2;
            let rotatedY =
                sin(rotationAngle) * (x - rotatedImage.width / 2) +
                cos(rotationAngle) * (y - rotatedImage.height / 2) +
                rotatedImage.height / 2;

            if (
                rotatedX >= 0 &&
                rotatedX < rotatedImage.width &&
                rotatedY >= 0 &&
                rotatedY < rotatedImage.height
            ) {
                let pixelIndex = (x + y * rotatedImage.width) * 4;
                let rotatedPixelIndex =
                    (int(rotatedX) + int(rotatedY) * rotatedImage.width) * 4;

                rotatedImage.pixels[rotatedPixelIndex] = img.pixels[pixelIndex]; // Red component
                rotatedImage.pixels[rotatedPixelIndex + 1] = img.pixels[pixelIndex + 1]; // Green component
                rotatedImage.pixels[rotatedPixelIndex + 2] = img.pixels[pixelIndex + 2]; // Blue component
                rotatedImage.pixels[rotatedPixelIndex + 3] = img.pixels[pixelIndex + 3]; // Alpha component
            }
        }
    }

    rotatedImage.updatePixels(); // Update the rotated image with the new pixel values
    return rotatedImage; // Return the rotated image
}

function rotateImage(img, direction) {
    let rotatedImage = img.get();
    let centerX = rotatedImage.width / 2;
    let centerY = rotatedImage.height / 2;

    push();
    translate(centerX, centerY);

    switch (direction) {
        case "esquerra":
            rotationAngle -= 0.1; // Girem la imatge en sentit horari indefinidament.

            break;
        case "dreta":
            rotationAngle += 0.1; // Girem la imatge en sentit horari indefinidament.

            break;
        default:
            console.error("Dirección de rotación no válida");
            break;
    }

    rotate(currentAngle);
    image(rotatedImage, -centerX, -centerY);
    pop();
}
// Función para aplicar la convolución a una imagen
function detectEdges(image, newVideoWidth, newVideoHeight) {
    image.loadPixels(); // Cargamos los píxeles de la imagen original

    let start = new Date(); // Almacenamos el momento de inicio de loop que recorre todos los pixeles de la imagen para realizar el cálculo del tiempo que se tarda en crear el efecto deseado.
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            let c = convolution(x, y); // Cálculo de la convolución espacial de cada uno de los pixeles

            let position = (x + y * image.width) * 4; // Se crea un nuevo pixel con los parámetros definidos a continuacion sobre la imagen filteredImage
            image.pixels[position] = red(c);
            image.pixels[position + 1] = green(c);
            image.pixels[position + 2] = blue(c);

            image.pixels[position + 3] = 255; // Por defecto, el canal alfa de una imagen creada con createImage() es 0. Lo tenemos que cambiar a 255.
        }
    }

    image.updatePixels(); // Actualizamos el array de píxeles

    let end = new Date(); // almacenamos el momento final del loop que recorre toda la imagen (ya hemos recorrido toda la imagen y calculado la convolución)

    console.log("tiempo de ejecucion = ", end.getTime() - start.getTime(), "ms");

    return image;
}

function keyPressed() {
    //Funció que s'executa cada cop que es detecta una tecla polsada al teclat.

    switch (key.toLowerCase()) {
        case "a":
            activeFilters.add("negativeFilter");
            break;
        case "s":
            activeFilters.add("binarizedFilter");
            break;
        case "d":
            activeFilters.add("erodeFilter");
            break;
        case "f":
            activeFilters.add("posterizeFilter");
            break;
        case "p":
            activeFilters.add("contornos");
            break;
        case "o":
            activeFilters.add("rotate-right");
            break;
        case "i":
            activeFilters.add("rotate-left");
            break;
        case "arrowleft":
            activeFilters.add("move-left");
            break;
        case "arrowright":
            activeFilters.add("move-right");
            break;
        case "arrowup":
            activeFilters.add("move-up");
            break;
        case "arrowdown":
            activeFilters.add("move-down");
            break;
        default:
            break;
    }
}

function keyReleased() {
    switch (key.toLowerCase()) {
        case "a":
            activeFilters.delete("negativeFilter");
            break;
        case "s":
            activeFilters.delete("binarizedFilter");
            break;
        case "d":
            activeFilters.delete("erodeFilter");
            break;
        case "f":
            activeFilters.delete("posterizeFilter");
            break;
        case "p":
            activeFilters.delete("contornos");
            break;
        case "o":
            activeFilters.delete("rotate-right");
            break;
        case "i":
            activeFilters.delete("rotate-left");
            break;
        case "arrowleft":
            activeFilters.delete("move-left");
            break;
        case "arrowright":
            activeFilters.delete("move-right");
            break;
        case "arrowup":
            activeFilters.delete("move-up");
            break;
        case "arrowdown":
            activeFilters.delete("move-down");

            break;
    }
    if (activeFilters.size === 0) {

    }
}

function applyActiveFilters(newVideoWidth, newVideoHeight) {
    if (activeFilters.size === 0) {
        // Si no se ha activado ningún filtro específico
        image(video, 0, height - newVideoHeight, newVideoWidth, newVideoHeight); // Dibujar la imagen de la webcam sin filtro
    } else {
        // Si se han activado filtros específicos
        let filteredImage = video.get(); // Copia la imagen original de la webcam
        for (let filter of activeFilters) {
            switch (filter) {
                case "negativeFilter":
                    filteredImage = negativeImage(filteredImage);
                    // Dibujar la imagen procesada con todos los filtros aplicados
                    image(filteredImage, 0, height - newVideoHeight, newVideoWidth, newVideoHeight);

                    break;
                case "binarizedFilter":
                    filteredImage = applyBinarization(filteredImage);
                    // Dibujar la imagen procesada con todos los filtros aplicados
                    image(filteredImage, 0, height - newVideoHeight, newVideoWidth, newVideoHeight);

                    break;
                case "erodeFilter":
                    filteredImage = erodeImage(filteredImage);
                    // Dibujar la imagen procesada con todos los filtros aplicados
                    image(filteredImage, 0, height - newVideoHeight, newVideoWidth, newVideoHeight);

                    break;
                case "posterizeFilter":
                    filteredImage = posterizeImage(filteredImage);
                    image(filteredImage, 0, height - newVideoHeight, newVideoWidth, newVideoHeight);

                    // Dibujar la imagen procesada con todos los filtros aplicados
                    break;
                case "contornos":
                    filteredImage = detectEdges(
                        filteredImage,
                        newVideoWidth,
                        newVideoHeight
                    ); 
                    image(filteredImage, 0, height - newVideoHeight, newVideoWidth, newVideoHeight);

                    break;
                case "rotate-right":
                    rotateImage(filteredImage, "dreta");
                    break;
                case "rotate-left":
                    filteredImage = rotateImageLeft(filteredImage);
                    break;
                case "move-up":
                    let newY = height - newVideoHeight - 0.0001;
                    newY = constrain(newY, 0, height - newVideoHeight); // Asegura que no se salga de los límites del lienzo
                    image(filteredImage, 0, height - newY, newVideoWidth, newVideoHeight);
                    break
            }

        }
    }
}



function convolution(x, y) {
    let resultado_r = 0.0;
    let resultado_g = 0.0;
    let resultado_b = 0.0;

    const half = Math.floor(mtxtam / 2);

    const videoPixels = video.pixels; // Almacenamos una referencia a video.pixels para evitar múltiples accesos en cada iteración del bucle

    for (let i = 0; i < mtxtam; i++) {
        const xstart = x - half; // Calculamos el inicio de la región de interés en x
        const ystart = y - half + i; // Calculamos el inicio de la región de interés en y

        for (let j = 0; j < mtxtam; j++) {
            const xloc = xstart + j; // Calculamos la coordenada x local
            const yloc = ystart; // Calculamos la coordenada y local
            let loc = (xloc + video.width * yloc) * 4;

            loc = constrain(loc, 0, videoPixels.length - 1);

            const factor = mtx01[i][j]; // Almacenamos el factor de la matriz de convolución

            resultado_r += videoPixels[loc] * factor;
            resultado_g += videoPixels[loc + 1] * factor;
            resultado_b += videoPixels[loc + 2] * factor;
        }
    }

    resultado_r += offset;
    resultado_g += offset;
    resultado_b += offset;

    resultado_r = constrain(resultado_r, 0, 255);
    resultado_g = constrain(resultado_g, 0, 255);
    resultado_b = constrain(resultado_b, 0, 255);

    return color(resultado_r, resultado_g, resultado_b);
}

function getEnergy() {
    let spectrum = fft.analyze();
    let energy = fft.getEnergy("bass", "lowMid"); // Obtén la energía en un rango de frecuencias específico
    let normalizedEnergy = map(energy, 0, 255, 0, 1); // Normaliza el valor de energía a un rango de 0 a 1

    return normalizedEnergy;
}


// function moveImage(image, amount, newVideoHeight) {
//     let movedImage = image.get(); // Copia la imagen original

//     // Actualiza las coordenadas de dibujo en el eje Y
//     let newY = height - newVideoHeight - amount;
//     newY = constrain(newY, 0, height - newVideoHeight); // Asegura que no se salga de los límites del lienzo

//     // devuelve la imagen modificada
//     return image(movedImage, 0, newY, newVideoWidth, newVideoHeight);
// }