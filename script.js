function convert() {
    const input = document.getElementById('imageInput');
    const format = document.getElementById('formatSelect').value;
    const files = input.files;
    
    if (!files.length) {
        alert("Pilih minimal satu file!");
        return;
    }
    
    // Tampilkan loading spinner
    document.getElementById('loadingSpinner').classList.remove('hidden');
    document.getElementById('downloadLink').classList.add('hidden');
    
    const fileName = document.getElementById('fileNameInput').value || "converted";
    
    setTimeout(() => {
        if (format === 'pdf') {
            convertToPDF(files, fileName);
        } else if (format === 'zip') {
            convertToZIP(files, fileName);
        } else if (format === 'image-from-file') {
            convertFileToImage(files);
        } else {
            convertToImageFormat(files, format, fileName);
        }
        
        // Sembunyikan loading spinner setelah selesai
        document.getElementById('loadingSpinner').classList.add('hidden');
    }, 500); // Delay agar animasi terlihat
}

// ========== 1. Convert to PDF ==========
function convertToPDF(files, fileName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let promises = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (file.type.startsWith('image/')) {
            const imgPromise = new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const width = doc.internal.pageSize.getWidth();
                        const height = doc.internal.pageSize.getHeight();
                        const ratio = Math.min(width / img.width, height / img.height);
                        const scaledWidth = img.width * ratio;
                        const scaledHeight = img.height * ratio;
                        
                        doc.addImage(img.src, "JPEG", 0, 0, scaledWidth, scaledHeight);
                        if (i !== files.length - 1) doc.addPage();
                        resolve();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
            promises.push(imgPromise);
        } else if (ext === 'pdf') {
            const pdfPromise = new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async function(e) {
                    const typedarray = new Uint8Array(e.target.result);
                    const pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
                    
                    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                        const page = await pdfDoc.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 1.5 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        
                        await page.render({ canvasContext: context, viewport }).promise;
                        
                        const imgData = canvas.toDataURL('image/jpeg', 1.0);
                        
                        const width = doc.internal.pageSize.getWidth();
                        const height = doc.internal.pageSize.getHeight();
                        const ratio = Math.min(width / canvas.width, height / canvas.height);
                        const scaledWidth = canvas.width * ratio;
                        const scaledHeight = canvas.height * ratio;
                        
                        doc.addImage(imgData, "JPEG", 0, 0, scaledWidth, scaledHeight);
                        if (pageNum < pdfDoc.numPages) doc.addPage();
                    }
                    resolve();
                };
                reader.readAsArrayBuffer(file);
            });
            promises.push(pdfPromise);
        }
    }
    
    Promise.all(promises).then(() => {
        const blob = doc.output('blob');
        saveAs(blob, `${fileName}.pdf`);
        const link = document.getElementById('downloadLink');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.pdf`;
        link.textContent = "Download PDF";
        link.classList.remove('hidden');
    });
}

// ========== 2. Convert to ZIP ==========
function convertToZIP(files, fileName) {
    const zip = new JSZip();
    const folder = zip.folder("converted_images");
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        folder.file(file.name, file);
    }
    
    zip.generateAsync({ type: "blob" }).then(function(content) {
        saveAs(content, `${fileName}.zip`);
        const link = document.getElementById('downloadLink');
        link.href = URL.createObjectURL(content);
        link.download = `${fileName}.zip`;
        link.textContent = "Download ZIP";
        link.classList.remove('hidden');
    });
}

// ========== 3. Convert to PNG, JPG, WebP, BMP ==========
function convertToImageFormat(files, targetFormat, fileName) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(function(blob) {
                    const newName = fileName + "_" + (index + 1) + "." + targetFormat;
                    saveAs(blob, newName);
                    const link = document.getElementById('downloadLink');
                    link.href = URL.createObjectURL(blob);
                    link.download = newName;
                    link.textContent = "Download File";
                    link.classList.remove('hidden');
                }, "image/" + targetFormat);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ========== 4. File to Image (PDF -> IMAGE) ==========
async function convertFileToImage(files) {
    for (const file of files) {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                const typedarray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    await page.render({ canvasContext: context, viewport }).promise;
                    
                    canvas.toBlob(function(blob) {
                        const newName = `page_${pageNum}.png`;
                        saveAs(blob, newName);
                        const link = document.getElementById('downloadLink');
                        link.href = URL.createObjectURL(blob);
                        link.download = newName;
                        link.textContent = "Download Page as PNG";
                        link.classList.remove('hidden');
                    }, 'image/png');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert("Maaf, hanya mendukung PDF untuk fitur File to Image.");
        }
    }
}
