const serverTypeDropdown = document.getElementById("serverTypeDropdown");


serverTypeDropdown.addEventListener("change", (e) => {
    serverType = e.target.value;
    UpdateServer(serverType);


})


function UpdateServer(serverType, changeURL = true) {
    if (serverType === ServerType.Automatic1111) {
        
        ToggleElements(".comfyui", false)
        ToggleElements(".horde", false)
        ToggleElements(".automatic1111", true)
        if (changeURL) {
            urlInput.value = "http://127.0.0.1:7860"
            url = urlInput.value
        }
        batchSizeSlider.max = 4;
        lorasHandled = false;
        HandleLoras();


    } else if (serverType === ServerType.ComfyUI) {
        ToggleElements(".automatic1111", false)
        ToggleElements(".horde", false)
        ToggleElements(".comfyui", true)
        if (changeURL) {
            urlInput.value = "http://127.0.0.1:8188"
            url = urlInput.value
        }

    } else if (serverType === ServerType.Horde) {
        ToggleElements(".automatic1111", false)
        ToggleElements(".comfyui", false)
        ToggleElements(".horde", true)
        if (changeURL) {
            urlInput.value = token
            url = urlInput.value
        }
        Horde();
        offlineBanner.classList.add("hidden")
        connectingBanner.classList.add("hidden")
        batchSizeSlider.max = 10;
    }
    updateCivitAi();
    handleURLChange();
}

function ToggleElements(selector, visible) {
    let elements = document.querySelectorAll(selector);

    elements.forEach(element => {
        if (visible) {
            element.classList.remove("hidden");
        } else {
            element.classList.add("hidden");
        }
    });
}

function Horde() {

    //[ k_lms, k_heun, k_euler, k_euler_a, k_dpm_2, k_dpm_2_a, k_dpm_fast, k_dpm_adaptive, k_dpmpp_2s_a, k_dpmpp_2m, dpmsolver, k_dpmpp_sde, DDIM ]
    samplers = [
        "k_euler_a",
        "k_dpmpp_2m",
        "k_euler",
        "k_heun",
        "k_lms",
        "k_dpm_2",
        "k_dpm_2_a",
        "k_dpm_fast",
        "k_dpm_adaptive",   
        "k_dpmpp_2s_a",
        "dpmsolver",
        "k_dpmpp_sde",
        "DDIM"

    ]

    var dropdown = document.getElementById("sampling-method")
    dropdown.innerHTML = "";
    for (var i = 0; i < samplers.length; i++) {
        var option = document.createElement("option");
        option.value = samplers[i];
        option.text = samplers[i];
        dropdown.appendChild(option);
    }
    civitaiSearch("");
    
}