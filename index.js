const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

ffmpeg.setFfprobePath("C:\\PATH_programs\\ffprobe.exe");

const carpeta = "C:/Users/darel/Desktop/compresor/origin";
const carpetaSalidaFHD = "C:/Users/darel/Desktop/compresor/origin/720P";
const carpetaSalidaHD = "C:/Users/darel/Desktop/compresor/origin/480P";

const MAX_CONCURRENT_COMPRESSIONS = 2;
let currentCompressionCount = 0;

function obtenerInformacionVideo(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, probeData) => {
      if (err) {
        reject(err);
        return;
      }

      const durationInSeconds = probeData.format.duration || 0;
      const sizeInBytes = fs.statSync(videoPath).size || 0;
      const streams = probeData.streams || [];
      let resolution = "Desconocida";

      for (const stream of streams) {
        if (stream.codec_type === "video") {
          resolution = `${stream.width}x${stream.height}`;
          break;
        }
      }

      const durationInMinutes = (durationInSeconds / 60).toFixed(2);
      const sizeInMegabytes = (sizeInBytes / (1024 * 1024)).toFixed(2);

      const videoInfo = {
        duration: durationInMinutes,
        size: sizeInMegabytes,
        resolution,
      };

      resolve(videoInfo);
    });
  });
}

function comprimirVideo(video, callback) {
  currentCompressionCount++;

  const rutaVideo = path.join(carpeta, video);
  const nombreArchivoSalidaFHD =
    path.basename(video, path.extname(video)) + "_720P.mp4";
  const rutaSalidaFHD = path.join(carpetaSalidaFHD, nombreArchivoSalidaFHD);

  const compressionProcess = ffmpeg(rutaVideo)
    .output(rutaSalidaFHD)
    .videoCodec("libx264")
    .size("1280x720")
    .noAudio()
    .on("end", () => {
      console.log(`El video ${video} ha sido comprimido.`);
      currentCompressionCount--;
      callback();
    })
    .on("progress", function (progress) {
      console.log("... frames: " + progress.frames);
    })
    .on("error", (err) => {
      console.error(`Error al comprimir el video ${video}:`, err);
      currentCompressionCount--;
      callback();
    })
    .run();
}

if (!fs.existsSync(carpetaSalidaHD)) {
  fs.mkdirSync(carpetaSalidaHD);
}

if (!fs.existsSync(carpetaSalidaFHD)) {
  fs.mkdirSync(carpetaSalidaFHD);
}

const extensionesVideo = [".mp4", ".avi", ".mkv", ".mov"];

fs.readdir(carpeta, (err, archivos) => {
  if (err) {
    console.error("Error al leer la carpeta:", err);
    return;
  }

  const archivosDeVideo = archivos.filter((archivo) => {
    const extension = path.extname(archivo).toLowerCase();
    return extensionesVideo.includes(extension);
  });

  function procesarSiguienteVideo(index) {
    if (index < archivosDeVideo.length) {
      const video = archivosDeVideo[index];
      comprimirVideo(video, () => {
        procesarSiguienteVideo(index + 1);
      });
    }
  }

  function iniciarCompresionesIniciales() {
    for (let i = 0; i < Math.min(MAX_CONCURRENT_COMPRESSIONS, archivosDeVideo.length); i++) {
      procesarSiguienteVideo(i);
    }
  }

  iniciarCompresionesIniciales();
});
