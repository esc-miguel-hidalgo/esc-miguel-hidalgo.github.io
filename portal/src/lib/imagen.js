// Comprime fotos antes de subirlas (adaptado de seprn-sitio/js/tramites-shared.js).
// Una foto de celular de 4–8 MB queda en ~300–600 KB, que cuenta mucho con el
// límite gratuito de almacenamiento y con datos móviles.
export function comprimirImagen(file, anchoMax = 1600, calidad = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, anchoMax / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))),
        'image/jpeg',
        calidad,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

/** Solo JPG/PNG/WebP se comprimen; HEIC no lo decodifican todos los navegadores. */
export const esComprimible = (file) => /^image\/(jpeg|png|webp)$/.test(file.type);
