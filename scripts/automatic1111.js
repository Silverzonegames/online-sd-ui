
let samplers = []
let current_image = 0;

let all_models = [];
let all_checkpoints = [];
let AOptions = {};


// Image generation function
function generateImage(isUpscale = false, isUltimate = false, IsSDUpscale = false, isLatent = false) {


  if (isUpscale == undefined) {
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


  if (isUpscale == true) {
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
    "do_not_save_grid": true,
    "do_not_save_samples": true
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

  if (isUpscale) {
    if (isUltimate) {
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
    else if (IsSDUpscale) {
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


  //print timestamp 20230906160734 YearMonthDayHourMinuteSecond
  var d = new Date();
  var timestamp = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0') + d.getHours().toString().padStart(2, '0') + d.getMinutes().toString().padStart(2, '0') + d.getSeconds().toString().padStart(2, '0');
  console.log(parseInt(timestamp));

  let isGenerating = true;

  const outputImage = document.getElementById("outputImage");

  function updateProgress(data) {
    if (!isGenerating) {
      progress_bar.classList.add("hidden");
      clearInterval(progressInterval);
      return;
    }

    if (data.state.job === "") {
      progress_bar.classList.add("hidden");
      clearInterval(progressInterval);
      return;
    }

    if (Math.abs(parseInt(timestamp) - parseInt(data.timestamp)) > 2) {
      return;
    }

    progress = data.progress;
    console.log("Progress: " + progress);

    progress_bar.classList.remove("hidden");
    progress_bar_progress.style.width = progress * 100 + "%";
    progress_bar_progress.textContent =
      Math.round(progress * 100) + "%" + " ETA:" + secondsToString(data.eta_relative);

    if (data.current_image != null) {
      outputImage.src = "data:image/png;base64, " + data.current_image;
      outputImage.classList.add("blur-sm");
    }

    if (progress >= 1) {
      progress_bar.classList.add("hidden");
      clearInterval(progressInterval);
    }
  }

  const progressInterval = setInterval(() => {
    fetch(url + '/sdapi/v1/progress')
      .then((response) => response.json())
      .then(updateProgress)
      .catch((error) => {
        console.error('Error fetching progress:', error);
      });
  }, 500);

  /// ------------------ 1. Generate the image ------------------ ///

  let req = fetch(api, {
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

      isGenerating = false;
      clearInterval(progressInterval);
      document.getElementById("outputImage").classList.remove("blur-sm");


      if (isUpscale) {
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
      current_image = 0;
      updateFullscreenImage(generatedImages[0].toString());

      const imgButtonContainer = document.getElementById("imgButtons");
      imgButtonContainer.innerHTML = "";

      i = 0;

      generatedImages.forEach((imageSrc, index) => {

        CanSave = true;

        if (batchSize > 1 && i == 0 && saveToServer) {
          CanSave = false;
        }
        if (i > (batchSize)) {
          i++;
          return;
        }

        console.log(i);

        if (document.getElementById("saveToHistory").checked && CanSave) {

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
          current_image = index;
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
      isGenerating = false;
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

function secondsToString(_seconds) {
  let sec_num = parseInt(_seconds, 10);
  let days = Math.floor(sec_num / 86400);
  let hours = Math.floor((sec_num - (days * 86400)) / 3600);
  let minutes = Math.floor((sec_num - (days * 86400) - (hours * 3600)) / 60);
  let seconds = sec_num - (days * 86400) - (hours * 3600) - (minutes * 60);

  let time = "";
  if (days > 0) {
    time = days + "d " + hours + "h " + minutes + "m " + seconds + "s";
  } else if (hours > 0) {
    time = hours + "h " + minutes + "m " + seconds + "s";
  } else if (minutes > 0) {
    time = minutes + "m " + seconds + "s";
  } else {
    time = seconds + "s";
  }
  return time;
}


async function checkStatus() {

  if (serverType != ServerType.Automatic1111) {
    return;
  }


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
function getUpscalers() {
  fetch(url + '/sdapi/v1/upscalers')
    .then(response => response.json())
    .then(data => {
      upscalers = [];

      data.forEach((upscaler) => {
        upscalers.push(upscaler.name);
      });
      console.log("Found upscalers:", upscalers);
      updateUpscalers("ultimate-upscale-upscaler_index", true);
      updateUpscalers("sd-upscale-upscaler_index")
      updateUpscalers("esrgan-upscale-upscaler_index")

    }).catch(error => {
      console.error("Error fetching upscalers:", error);
    });
}
function getSamplers() {
  fetch(url + '/sdapi/v1/samplers')
    .then(response => response.json())
    .then(data => {
      samplers = [];

      data.forEach((sampler) => {
        samplers.push(sampler.name);
      });
      console.log("Found samplers:", samplers);

      const samplerDropdown = document.getElementById("sampling-method");
      samplerDropdown.innerHTML = "";
      samplers.forEach((sampler) => {
        const option = document.createElement("option");
        option.value = sampler;
        option.text = sampler;
        samplerDropdown.appendChild(option);
      });


    }).catch(error => {
      console.error("Error fetching samplers:", error);
    });
}
function getCheckpoints(){

  const selector = document.getElementById("checkpoint-selector");

  fetch(url + '/sdapi/v1/sd-models').then(response => response.json()).then(data => {
    all_checkpoints = data;

    fetch(url+"/sdapi/v1/options").then(response => response.json()).then(_data => {
      AOptions = _data;
      selector.innerHTML = "";
      all_checkpoints.forEach((checkpoint) => {
        const option = document.createElement("option");
        option.value = checkpoint.title;
        option.text = checkpoint.model_name;
        selector.appendChild(option);
      });
      selector.value = AOptions["sd_model_checkpoint"];
    }).catch(error => {
      console.error("Error fetching options:" + error);
    });



    if(!isLocalhost(url)){
      selector.disabled = true;
    }else{
      selector.disabled = false;
    }

  }).catch(error => {
    showMessage(error.message);
    all_checkpoints = [];
  });
}


function getAllInstalled(){
  fetch(url+"civitai/all-installed").then(response => response.json()).then(data => {
    all_models = data;
  }).catch(error => {
    all_models = [];
  });
}


document.getElementById("checkpoint-selector").addEventListener("change", (e) => {
  if (confirm("Are you sure you want to Change Model?")){
    let _options = {}
    _options["sd_model_checkpoint"] = e.target.value;

    //post new options to server
    fetch(url+"/sdapi/v1/options", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(_options)
    }).then(response => {
      if (!response.ok) {
        showMessage(response.error);
        throw new Error('Request failed');
      }
      return response.json();
    }).then(data => {
      getCheckpoints();
      showMessage("Model Loaded!",300,"success");
    }).catch(error => {
      console.error('Error:', error);
    });
  }
});

document.getElementById("esrgan-upscale-btn").addEventListener("click", () => {

  const payload = {
    image: document.getElementById("outputImage").src.replace("data:image/png;base64,", ""),
    upscaling_resize: document.getElementById("esrgan-scale").value,
    upscaler_1: document.getElementById("esrgan-upscale-upscaler_index").value,
  };

  const imageDisplay = document.getElementById('outputImage');
  const generateBtn = document.getElementById('generateBtn');
  generateBtn.disabled = true;
  generateBtn.textContent = "Upscaling...";
  document.getElementById("imgButtons").innerHTML = "";

  imageDisplay.src = "loading.gif";



  fetch(url + "/sdapi/v1/extra-single-image", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).then(response => {
    if (!response.ok) {
      showMessage(response.error);
      throw new Error('Request failed');
    }
    return response.json();
  }).then(data => {
    console.log(data);
    document.getElementById("outputImage").src = "data:image/png;base64, " + data.image;
    generatedImages = ["data:image/png;base64, "+ data.image];
    current_image = 0;
    updateFullscreenImage("data:image/png;base64, " + data.image);

    //save to history
    addToImageHistory("data:image/png;base64, " + data.image, data.html_info);

    generateBtn.disabled = false;
    generateBtn.textContent = "Generate";
    document.getElementById("generatedImageOptions").classList.remove("hidden");


  }).catch(error => {
    console.error('Error:', error);
  });

});