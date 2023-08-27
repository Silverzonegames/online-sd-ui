const serverTypeDropdown = document.getElementById("serverTypeDropdown");


serverTypeDropdown.addEventListener("change", (e) => {
    serverType = e.target.value;
    UpdateServer(serverType);


})


function UpdateServer(serverType){
    if (serverType === ServerType.Automatic1111) {
        ToggleElements(".comfyui",false)
        ToggleElements(".horde",false)
        ToggleElements(".automatic1111",true)
        urlInput.value = "http://127.0.0.1:7860"
        url = urlInput.value
    }else if (serverType === ServerType.ComfyUI) {
        ToggleElements(".automatic1111",false)
        ToggleElements(".horde",false)
        ToggleElements(".comfyui",true)
        urlInput.value = "http://127.0.0.1:8188"
        url = urlInput.value
    }else if (serverType === ServerType.Horde) {
        ToggleElements(".automatic1111",false)
        ToggleElements(".comfyui",false)
        ToggleElements(".horde",true)
        urlInput.value = "0000000000"
        url = urlInput.value
    }
    handleURLChange();
}

function ToggleElements(selector,visible) {
    let elements = document.querySelectorAll(selector);

    elements.forEach(element => {
        if(visible){
            element.classList.remove("hidden");
        }else{
            element.classList.add("hidden");
        }
    });
}