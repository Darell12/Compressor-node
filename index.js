const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

ffmpeg.setFfprobePath("C:\\PATH_programs\\ffprobe.exe");

const carpeta = "C:/Users/darel/Desktop/compresor/origin";
const carpetaSalidaOriginal =
  "C:/Users/darel/Desktop/compresor/origin/original";
const carpetaSalidaFHD = "C:/Users/darel/Desktop/compresor/origin/720P";
const carpetaSalidaHD = "C:/Users/darel/Desktop/compresor/origin/480P";

const MAX_CONCURRENT_COMPRESSIONS = 2;
let currentCompressionCount = 0;

function obtenerInformacionVideo(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(metadata);
    });
  });
}

function comprimirVideo(video, resolucion, carpetaSalida, callback) {
  currentCompressionCount++;

  const rutaVideo = path.join(carpeta, video);
  const nombreArchivoSalida =
    path.basename(video, path.extname(video)) + `_${resolucion}.mp4`;
  const rutaSalida = path.join(carpetaSalida, nombreArchivoSalida);

  obtenerInformacionVideo(rutaVideo)
    .then((info) => {
      const fps =
        info.streams.find((s) => s.codec_type === "video")?.r_frame_rate ||
        "30/1";
      const totalFrames = Math.ceil(parseFloat(fps) * info.format.duration);

      ffmpeg(rutaVideo)
        .output(rutaSalida)
        .videoCodec("libx264")
        .size(resolucion)
        .on("end", () => {
          process.stdout.write("\n"); // Salto de línea al finalizar
          console.log(`El video ${video} ha sido comprimido a ${resolucion}.`);
          currentCompressionCount--;
          callback();
        })
        .on("progress", function (progress) {
          const percent = (progress.frames / totalFrames) * 100;
          process.stdout.clearLine(); // Limpiar la línea actual
          process.stdout.cursorTo(0); // Mover el cursor al principio de la línea
          process.stdout.write(
            `Progreso ${video} (${resolucion}): ${percent.toFixed(2)}%`
          );
        })
        .on("error", (err) => {
          console.error(
            `Error al comprimir el video ${video} a ${resolucion}:`,
            err
          );
          currentCompressionCount--;
          callback();
        })
        .run();
    })
    .catch((err) => {
      console.error(`Error al obtener información del video ${video}:`, err);
      currentCompressionCount--;
      callback();
    });
}

function iniciarCompresionesIniciales() {
  fs.readdir(carpeta, (err, archivos) => {
    if (err) {
      console.error("Error al leer la carpeta:", err);
      return;
    }

    const archivosDeVideo = archivos.filter((archivo) => {
      const extension = path.extname(archivo).toLowerCase();
      return [".mp4", ".avi", ".mkv", ".mov"].includes(extension);
    });

    const videosPendientes = archivosDeVideo.slice(); // Copiar la lista de videos

    function procesarSiguienteVideo() {
      if (videosPendientes.length > 0) {
        const video = videosPendientes.shift(); // Tomar el próximo video
        comprimirVideo(video, "1280x720", carpetaSalidaFHD, () => {
          comprimirVideo(video, "854x480", carpetaSalidaHD, () => {
            procesarSiguienteVideo(); // Llamada recursiva para procesar el siguiente
          });
        });
      }
    }

    // Iniciar el procesamiento inicial
    for (
      let i = 0;
      i < Math.min(MAX_CONCURRENT_COMPRESSIONS, videosPendientes.length);
      i++
    ) {
      procesarSiguienteVideo();
    }
  });
}

iniciarCompresionesIniciales();
