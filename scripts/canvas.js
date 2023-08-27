const canvas_imageInput = document.getElementById('canvas_imageInput');
const canvasWidthInput = document.getElementById('canvas_canvasWidth');
const canvasHeightInput = document.getElementById('canvas_canvasHeight');
const resizeCanvasButton = document.getElementById('canvas_resizeCanvas');
const imageCanvas = document.getElementById('canvas_imageCanvas');
const imageWrapper = document.getElementById('canvas_imageWrapper');
const canvas_ctx = imageCanvas.getContext('2d');
let canvas_uploadedImage = null;

        canvas_imageInput.addEventListener('change', () => {

            console.log(canvas_imageInput.files[0]);
            const file = canvas_imageInput.files[0];
            if (file) {
                canvas_uploadedImage = new Image();
                canvas_uploadedImage.src = URL.createObjectURL(file);
                canvas_uploadedImage.onload = () => {
                    drawImageOnCanvas();
                };
            }
        });

        function resizeCanvas(width, height) {
            imageCanvas.width = width;
            imageCanvas.height = height;
            drawImageOnCanvas();
        }

        function drawImageOnCanvas() {
            if (canvas_uploadedImage) {
                canvas_ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
                const aspectRatio = canvas_uploadedImage.width / canvas_uploadedImage.height;
                const canvasAspectRatio = imageCanvas.width / imageCanvas.height;

                let drawWidth = imageCanvas.width * ImageScale;
                let drawHeight = (imageCanvas.width * ImageScale) / aspectRatio;

                if (aspectRatio > canvasAspectRatio) {
                    drawWidth = imageCanvas.width * ImageScale;
                    drawHeight = (imageCanvas.width * ImageScale) / aspectRatio;
                } else {
                    drawWidth = (imageCanvas.height * ImageScale) * aspectRatio;
                    drawHeight = imageCanvas.height * ImageScale;
                }

                const drawX = (imageCanvas.width - drawWidth) / 2;
                const drawY = (imageCanvas.height - drawHeight) / 2;

                canvas_ctx.drawImage(canvas_uploadedImage, drawX, drawY, drawWidth, drawHeight);

                imageWrapper.style.width = drawWidth + 'px';
                imageWrapper.style.height = drawHeight + 'px';
                imageWrapper.style.left = drawX + 'px';
                imageWrapper.style.top = drawY + 'px';
            }
        }

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        let ImageScale = 0.5;

        imageCanvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - parseFloat(imageWrapper.style.left || 0);
            offsetY = e.clientY - parseFloat(imageWrapper.style.top || 0);
        });
        imageCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -Math.sign(e.deltaY); // Inverted scroll direction
            const currentScale = parseFloat(imageScaleInput.value);
            const newScale = Math.min(Math.max(currentScale + delta * 0.1, 0.1), 2); // Adjust scale within limits
            imageScaleInput.value = newScale;
            imageScaleValue.textContent = newScale.toFixed(1); // Update the associated value input
            updateCanvasScale(); // Update the canvas based on the new scale
        });


        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const x = e.clientX - offsetX;
                const y = e.clientY - offsetY;
                const maxX = imageCanvas.width - parseFloat(imageWrapper.style.width);
                const maxY = imageCanvas.height - parseFloat(imageWrapper.style.height);
                const constrainedX = Math.min(Math.max(0, x), maxX);
                const constrainedY = Math.min(Math.max(0, y), maxY);
                imageWrapper.style.left = constrainedX + 'px';
                imageWrapper.style.top = constrainedY + 'px';

                const imageX = (constrainedX / imageCanvas.width) * canvas_uploadedImage.width * imageCanvas.width / canvas_uploadedImage.width;
                const imageY = (constrainedY / imageCanvas.height) * canvas_uploadedImage.height * imageCanvas.height / canvas_uploadedImage.height;

                canvas_ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
                canvas_ctx.drawImage(
                    canvas_uploadedImage,
                    imageX,
                    imageY,
                    parseFloat(imageWrapper.style.width),
                    parseFloat(imageWrapper.style.height)
                );
            }
        });

        function reverseAlphaMask(image) {
            const canvas = document.createElement('canvas');
            const canvas_ctx = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;

            canvas_ctx.drawImage(image, 0, 0);

            const imageData = canvas_ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                data[i] = data[i + 1] = data[i + 2] = alpha === 0 ? 255 : 0; // Set RGB based on alpha
                data[i + 3] = 255; // Set alpha to fully opaque
            }

            canvas_ctx.putImageData(imageData, 0, 0);

            const reversedImage = new Image();
            reversedImage.src = canvas.toDataURL('image/png');
            return reversedImage;
        }

        document.getElementById("canvas_exportImage").addEventListener('click', () => {
            const dataURL = imageCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = 'canvas_image.png';
            document.body.appendChild(a); // Append the 'a' element to the body
            a.click();
            document.body.removeChild(a); // Remove the 'a' element from the body after clicking

            // Generate and download the reverse alpha mask of the canvas image
            const reversedMaskImage = reverseAlphaMask(imageCanvas);
            const reversedMaskDataURL = reversedMaskImage.src;
            const reversedMaskA = document.createElement('a');
            reversedMaskA.href = reversedMaskDataURL;
            reversedMaskA.download = 'mask.png';
            document.body.appendChild(reversedMaskA);
            reversedMaskA.click();
            document.body.removeChild(reversedMaskA);
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        const CanvasRatio = document.getElementById("canvas_CanvasRatio");
        const CanvasWidth = document.getElementById("canvas_CanvasWidth");
        const CanvasHeight = document.getElementById("canvas_CanvasHeight");
        const imageScaleInput = document.getElementById('canvas_imageScale');
        const imageScaleValue = document.getElementById('canvas_imageScaleValue');


        CanvasRatio.addEventListener('input', (e) => {
            const minResolution = 512;
            const maxResolution = 1024;
            let width = minResolution + (maxResolution - minResolution) * Math.abs(CanvasRatio.value);
            let height = minResolution + (maxResolution - minResolution) * (Math.abs(CanvasRatio.value));

            if(CanvasRatio.value > 0){
                width = 512;
            }else if (CanvasRatio.value < 0){
                height = 512;
            }else{
                width = 512;
                height = 512;
            }

            width = parseInt(width);
            height = parseInt(height);

            console.log(width, height);
            CanvasWidth.value = width;
            CanvasHeight.value = height;
            resizeCanvas(width, height);
        });



        function updateCanvasScale() {
            ImageScale = parseFloat(imageScaleInput.value);
            drawImageOnCanvas();
        }
        imageScaleInput.addEventListener('input', () => {
            imageScaleValue.value = imageScaleInput.value;
            updateCanvasScale();
        });

        imageScaleValue.addEventListener('input', () => {
            imageScaleInput.value = imageScaleValue.value;
            updateCanvasScale();
        });

        updateCanvasScale();
