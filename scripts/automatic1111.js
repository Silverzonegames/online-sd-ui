// Image generation function
function generateImage(isUpscale=false,isUltimate=false,IsSDUpscale=false,isLatent=false) {


    if(isUpscale == undefined){
      isUpscale = false;
    }
  
  
    checkStatus();
    const imageDisplay = document.getElementById('outputImage');
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";
    document.getElementById("imgButtons").innerHTML = "";
  
    console.log("Generating image..." + document.getElementById('prompt').value);
    imageDisplay.src = "loading.gif";
  
    let img2img = uploadedImageBase64 != "";
    let isInpaint = maskImageBase64 != "";
  
    let maskMode = null;
    let maskedFill = null;
    let inpaintArea = null;
    let pixelsSliderValue = null;
    let useControlnet = null;
  
  
    if(isUpscale == true){
      img2img = true;
      isInpaint = false;
    }
  
    if (isInpaint) {
      maskMode = document.querySelector('input[name="mask-mode"]:checked').value;
      maskedFill = document.querySelector('input[name="masked-fill"]:checked').value;
      inpaintArea = JSON.parse(document.querySelector('input[name="inpaint-area"]:checked').value);
      pixelsSliderValue = document.getElementById("pixels-slider").value;
      useControlnet = document.getElementById("use-controlnet").checked;
    }
  
  
    if (controlNetModel == null) {
      useControlnet = false;
    }
    const batchSize = parseInt(batchSizeSlider.value);
    const saveToServer = document.getElementById("saveToServer").checked
  
    let payload = {
      "prompt": document.getElementById('prompt').value,
      "negative_prompt": document.getElementById('negativePrompt').value,
      "steps": parseInt(stepsSlider.value),
      "width": width,
      "height": height,
      "sampler_name": samplerDropdown.value,
      "batch_size": batchSize,
      "styles": selectedStyles,
      "cfg_scale": parseFloat(cfgSlider.value),
      "seed": parseInt(seedDropdown.value),
      "save_images": saveToServer,
      "do_not_save_grid":true,
      "do_not_save_samples":true
    };
    if (img2img) {
      payload["init_images"] = [uploadedImageBase64];
      payload["denoising_strength"] = parseFloat(weightSlider.value);
      payload["resize_mode"] = 1
      if (isInpaint) {
        payload["mask"] = maskImageBase64;
        payload["inpainting_fill"] = parseInt(maskedFill);
        payload["inpaint_full_res"] = inpaintArea;
        payload["inpaint_full_res_padding"] = parseInt(pixelsSliderValue);
        payload["inpainting_mask_invert"] = parseInt(maskMode);
        if (useControlnet) {
          payload["alwayson_scripts"] = {
            "controlnet": {
              "args": [
                {
                  "module": "inpaint_only",
                  "model": controlNetModel,
                  // "control_mode": 2,
                }
              ]
            }
          };
        }
      }
    }
  
    if(isUpscale){
      if(isUltimate){
        payload["denoising_strength"] = parseFloat(document.getElementById("ultimate-upscale-denoising-strength").value);
        payload["batch_size"] = 1,
        payload["script_name"] = "Ultimate SD upscale",
        payload["script_args"] = [
          null, // _ (not used)
          512, // tile_width
          512, // tile_height
          8, // mask_blur
          32, // padding
          parseInt(document.getElementById("ultimate-upscale-seams_fix_width").value), // seams_fix_width
          parseFloat(document.getElementById("ultimate-upscale-seams_fix_denoise").value), // seams_fix_denoise
          parseInt(document.getElementById("ultimate-upscale-seams_fix_padding").value), // seams_fix_padding
          parseInt(document.getElementById("ultimate-upscale-upscaler_index").value), // upscaler_index
          true, // save_upscaled_image a.k.a Upscaled
          parseInt(document.getElementById("ultimate-upscale-redraw_mode").value), // redraw_mode
          false, // save_seams_fix_image a.k.a Seams fix
          8, // seams_fix_mask_blur
          0, // seams_fix_type
          2, // target_size_type
          2048, // custom_width
          2048, // custom_height
          parseFloat(document.getElementById("ultimate-upscale-scale").value) // custom_scale
      ];
      }
      else if(IsSDUpscale){
        payload["denoising_strength"] = parseFloat(document.getElementById("sd-upscale-denoising-strength").value);
        payload["batch_size"] = 1,
        payload["script_name"] = "sd upscale",
        payload["script_args"] = [
          null, // _ (not used)
          parseInt(document.getElementById("sd-upscale-tile_overlap").value), // tile overlap
          document.getElementById("sd-upscale-upscaler_index").value, // upscaler index
          parseFloat(document.getElementById("sd-upscale-scale").value)
        ]
      }
    }
  
    console.log(JSON.stringify(payload, null, 2));
  
    api = url + '/sdapi/v1/txt2img';
  
    if (img2img) {
      api = url + '/sdapi/v1/img2img';
    }
  
    fetch(api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(response => {
        if (!response.ok) {
          showMessage(response.error);
          throw new Error('Request failed');
        }
        return response.json();
      })
      .then(data => {
  
        if(isUpscale){
          uploadedImageBase64 = "";
        }
  
        if (data.error) {
          showMessage(data.error);
        }
  
        const imageDisplay = document.getElementById('outputImage');
  
  
        generatedImages = [];
  
        data.images.forEach((imageBase64, index) => {
          const imageURL = `data:image/png;base64, ${imageBase64}`;
          generatedImages.push(imageURL);
        });
        console.log("Finished generating " + generatedImages.length + " images");
        console.log(generatedImages);
        imageDisplay.src = generatedImages[0].toString();
        updateFullscreenImage(generatedImages[0].toString());
  
        const imgButtonContainer = document.getElementById("imgButtons");
        imgButtonContainer.innerHTML = "";
  
        i = 0;
  
        generatedImages.forEach((imageSrc, index) => {
  
          CanSave = true;
  
          if(batchSize > 1 && i == 0 && saveToServer){
            CanSave = false;
          }
          if(i>(batchSize)){
            i++;
            return;
          }
  
          console.log(i);
  
          if(document.getElementById("saveToHistory").checked && CanSave){
  
            const _payload = {
              "image": imageSrc.replace("data:image/png;base64,", ""),
            }
          
            fetch(url + "/sdapi/v1/png-info", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(_payload)
            }).then(response => {
              if (!response.ok) {
                showMessage(response.error);
                throw new Error('Request failed');
              }
              return response.json();
            }).then(data => {
              addToImageHistory(imageSrc, data["info"]);
            }).catch(error => {
              console.error('Error:', error);
            });
  
          }
  
  
          // Create the image button
          const imageButton = document.createElement('img');
          imageButton.src = imageSrc;
          imageButton.alt = `Image ${index + 1}`;
          imageButton.classList.add('w-12', 'h-12', 'border', 'border-gray-500', 'rounded-md', 'cursor-pointer', 'mr-2');
  
          // Add click event listener to the image button
          imageButton.addEventListener('click', () => {
            imageDisplay.src = imageSrc;
            updateFullscreenImage(imageSrc);
          });
  
          // Append the image button to the container
          imgButtonContainer.appendChild(imageButton);
  
          i++;
        });
  
  
  
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate";
        document.getElementById("generatedImageOptions").classList.remove("hidden");
      })
      .catch(error => {
        showMessage(error)
        console.error('Error:', error);
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate";
      });
  
  
  }

  async function GetControlnetModel(name) {
  try {
    const response = await fetch(url + '/controlnet/model_list');
    const data = await response.json();
    const modelList = data.model_list;

    // Find the model that includes the provided name
    const matchingModel = modelList.find(model => model.includes(name));
    console.log("Found controlnet model: " + matchingModel);
    controlNetModel = matchingModel; // Return the matching model or null if not found
  } catch (error) {
    console.error('Error fetching model list:', error);
  }
}

async function checkStatus() {

  offlineBanner.classList.add("hidden")
  connectingBanner.classList.remove("hidden");

  let online = false;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.status === 200) {
      console.log("Online");
      online = true;
    }
  } catch (error) {
    console.log("Offline");
    online = false;
  }


  // Show the offline banner if the connection is not successful
  if (!online) {
    offlineBanner.classList.remove("hidden");
  } else {
    offlineBanner.classList.add("hidden");
  }
  connectingBanner.classList.add("hidden");

}