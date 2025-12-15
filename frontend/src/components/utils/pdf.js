import { jsPDF } from "jspdf";

const pxToMm = (px) => (px * 25.4) / 96;

export const addCanvasAsPages = (pdf, canvas, marginMm = 10) => {
  const pageWidth = 210, pageHeight = 297; // A4 en mm
  const maxWidth = pageWidth - marginMm * 2;

  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;
  const imgWidthMm = pxToMm(imgWidthPx);
  const imgHeightMm = pxToMm(imgHeightPx);

  const scale = maxWidth / imgWidthMm;
  const scaledWidthMm = imgWidthMm * scale;
  const scaledHeightMm = imgHeightMm * scale;

  const pageInnerHeightMm = pageHeight - marginMm * 2;
  const sliceHeightPx = Math.floor((pageInnerHeightMm / scale) * (96 / 25.4));

  const tmp = document.createElement("canvas");
  const ctx = tmp.getContext("2d");

  let offsetPx = 0;
  let first = true;
  while (offsetPx < imgHeightPx) {
    const h = Math.min(sliceHeightPx, imgHeightPx - offsetPx);
    tmp.width = imgWidthPx;
    tmp.height = h;
    ctx.clearRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, offsetPx, imgWidthPx, h, 0, 0, imgWidthPx, h);
    const imgData = tmp.toDataURL("image/png");
    if (!first) pdf.addPage();
    first = false;
    pdf.addImage(
      imgData,
      "PNG",
      marginMm,
      marginMm,
      scaledWidthMm,
      (h / imgHeightPx) * scaledHeightMm
    );
    offsetPx += h;
  }
};

export const createA4 = () => new jsPDF("p", "mm", "a4");
