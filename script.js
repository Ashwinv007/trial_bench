const pdfUpload = document.getElementById('pdf-upload');
const addContentBtn = document.getElementById('add-content-btn');
const contentEntries = document.getElementById('content-entries');
const editPdfButton = document.getElementById('edit-pdf');
const clearAllBtn = document.getElementById('clear-all-btn');
const pdfContainer = document.getElementById('pdf-container');

function updateContentEntryHeadings() {
    const entries = document.querySelectorAll('.content-entry');
    entries.forEach((entry, index) => {
        entry.querySelector('h3').textContent = `Content Entry ${index + 1}`;
    });
}

addContentBtn.addEventListener('click', () => {
    const newEntry = contentEntries.firstElementChild.cloneNode(true);
    newEntry.querySelectorAll('input').forEach(input => input.value = '');
    contentEntries.appendChild(newEntry);
    updateContentEntryHeadings();
});

contentEntries.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-content-btn')) {
        if (contentEntries.children.length > 1) {
            e.target.parentElement.remove();
            updateContentEntryHeadings();
        } else {
            alert('You must have at least one content entry.');
        }
    } else if (e.target.classList.contains('duplicate-content-btn')) {
        const originalEntry = e.target.parentElement;
        const newEntry = originalEntry.cloneNode(true);
        originalEntry.after(newEntry);
        updateContentEntryHeadings();
    }
});

clearAllBtn.addEventListener('click', () => {
    const entries = document.querySelectorAll('.content-entry');
    for (let i = 1; i < entries.length; i++) {
        entries[i].remove();
    }
    const firstEntry = contentEntries.firstElementChild;
    firstEntry.querySelectorAll('input').forEach(input => input.value = '');
    updateContentEntryHeadings();
});

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
}

async function splitTextIntoLines(text, font, fontSize, maxWidth) {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth) {
            lines.push(line.trim());
            line = words[i] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());

    if (lines.length > 3) {
        const thirdLine = lines[2];
        const truncatedThirdLine = thirdLine.slice(0, thirdLine.length - 3) + '...';
        return lines.slice(0, 2).concat(truncatedThirdLine);
    }

    return lines;
}

editPdfButton.addEventListener('click', async () => {
    const file = pdfUpload.files[0];
    if (!file) {
        alert('Please upload a PDF file.');
        return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

    const entries = document.querySelectorAll('.content-entry');

    for (const entry of entries) {
        const content = entry.querySelector('.content-input').value;
        const issuedToX = parseInt(entry.querySelector('.x-coordinate').value);
        let issuedToY = parseInt(entry.querySelector('.y-coordinate').value);
        const pageNumber = parseInt(entry.querySelector('.page-number').value);
        const fontSize = parseInt(entry.querySelector('.font-size-input').value);
        const maxWidth = parseInt(entry.querySelector('.max-width-input').value);
        const color = entry.querySelector('.color-input').value;

        if (!content || isNaN(issuedToX) || isNaN(issuedToY) || isNaN(pageNumber) || isNaN(fontSize) || isNaN(maxWidth)) {
            alert('Please fill all the fields correctly for each entry.');
            return;
        }

        if (pageNumber < 1 || pageNumber > pages.length) {
            alert(`Invalid page number. Please enter a number between 1 and ${pages.length}.`);
            return;
        }

        const page = pages[pageNumber - 1];
        const lineHeight = fontSize * 1.2;
        const rgbColor = hexToRgb(color);

        const lines = await splitTextIntoLines(content, font, fontSize, maxWidth);

        for (const line of lines) {
            page.drawText(line, {
                x: issuedToX,
                y: issuedToY,
                size: fontSize,
                font: font,
                color: PDFLib.rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            });
            issuedToY -= lineHeight;
        }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.src = url;
    pdfContainer.innerHTML = '';
    pdfContainer.appendChild(iframe);
});