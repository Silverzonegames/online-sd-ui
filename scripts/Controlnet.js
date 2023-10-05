var controlnetInstalled = true;
var controlnetSettings = {};

var controlTypes = {}

var ControlNetUnits = []

//elements
const addControlnetBtn = document.getElementById("addControlnetBtn");
const ControlnetContainer = document.getElementById("ControlnetContainer");
const ControlnetEnable = document.getElementById("Controlnet-enable");
const ControlnetActiveText = document.getElementById("ControlnetActiveText");

function getControlnetSettings() {
    fetch(url + '/controlnet/settings')
        .then(response => response.json())
        .then(data => {
            controlnetSettings = data;
            console.log(controlnetSettings);
        }).catch((error) => {
            console.error('Error:', error);
            controlnetInstalled = false;
        });
}
function getControlTypes() {
    fetch(url + "/controlnet/control_types")
        .then(response => response.json())
        .then(data => {
            controlTypes = data;
            console.log("types", data);
        }).catch((error) => {
            console.error('Error:', error);
            controlnetInstalled = false;
        });
}

function AddControlNetUnit() {

    let canAddUnit = false;
    let index = -1;
    for (i = 0; i < controlnetSettings["control_net_unit_count"]; i++) {
        if(ControlNetUnits[i] == null){
            ControlNetUnits[i] = {};
            canAddUnit = true;
            index = i;
            break;
        }
    }
    if(!canAddUnit){
        console.log("Cant add any more controlnet units")
        return;
    }


    // Create a new container element
    const container = document.createElement("div");
    container.classList.add("bg-gray-800", "h-full", "my-3", "rounded");

    // Add the top row
    const topRow = document.createElement("div");
    topRow.classList.add("flex", "w-full", "mx-2", "py-2.5");

    // Add the enable toggle
    const toggleLabel = document.createElement("label");
    toggleLabel.classList.add("relative", "inline-flex", "items-center", "cursor-pointer");
    const toggleInput = document.createElement("input");
    toggleInput.setAttribute("type", "checkbox");
    toggleInput.classList.add("sr-only", "peer");
    const toggleDiv = document.createElement("div");
    toggleDiv.classList.add(
        "w-14",
        "h-7",
        "bg-gray-200",
        "peer-focus:outline-none",
        "peer-focus:ring-4",
        "peer-focus:ring-blue-300",
        "dark:peer-focus:ring-blue-800",
        "rounded-full",
        "peer",
        "dark:bg-gray-700",
        "peer-checked:after:translate-x-full",
        "peer-checked:after:border-white",
        "after:content-['']",
        "after:absolute",
        "after:top-1.5",
        "after:left-[4px]",
        "after:bg-white",
        "after:border-gray-300",
        "after:border",
        "after:rounded-full",
        "after:h-6",
        "after:w-6",
        "after:transition-all",
        "dark:border-gray-600",
        "peer-checked:bg-blue-600"
    );

    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleDiv);
    topRow.appendChild(toggleLabel);

    // Add the control type dropdown
    const controlTypeDropdown = document.createElement("select");
    controlTypeDropdown.classList.add(
        "mx-2",
        "flex-grow",
        "bg-white",
        "border",
        "pr-10",
        "pl-2",
        "py-2",
        "border-gray-300",
        "text-gray-900",
        "text-sm",
        "rounded-lg",
        "focus:ring-primary-500",
        "focus:border-primary-500",
        "block",
        "dark:bg-gray-600",
        "dark:border-gray-500",
        "dark:placeholder-gray-400",
        "dark:text-white",
        "dark:focus:ring-primary-500",
        "dark:focus:border-primary-500"
    );
    //loop through keys in controlTypes["control_types"]
    for (const [key, value] of Object.entries(controlTypes["control_types"])) {
        const option = document.createElement("option");
        option.value = key;
        option.innerText = key;
        controlTypeDropdown.appendChild(option);
    }


    // Add the delete button
    const deleteButton = document.createElement("button");
    deleteButton.classList.add("mr-4", "rounded", "bg-red-500", "w-8");
    const deleteIcon = document.createElement("i");
    deleteIcon.classList.add("fa-solid", "fa-trash", "text-white");
    deleteButton.appendChild(deleteIcon);

    topRow.appendChild(controlTypeDropdown);
    topRow.appendChild(deleteButton);

    container.appendChild(topRow);

    // Add the image and sliders section
    const imageAndSliders = document.createElement("div");
    imageAndSliders.classList.add("flex", "h-52");

    // Left side with sliders
    const leftSide = document.createElement("div");
    leftSide.classList.add("w-2/3", "m-2");

    // Add the labels and sliders
    const labelsAndSliders = [
        { label: "Weight", min: 0, max: 2, value: 1, step: 0.05 },
        { label: "Starting Step", min: 0, max: 1, value: 0, step: 0.01 },
        { label: "Ending Step", min: 0, max: 1, value: 1, step: 0.01 },
    ];
    let sliders = []

    labelsAndSliders.forEach((item) => {
        const label = document.createElement("label");
        label.setAttribute("for", "default-range");
        label.classList.add("block", "mb-2", "text-sm", "font-medium", "text-gray-900", "dark:text-white");
        label.innerText = item.label;

        const input = document.createElement("input");
        input.setAttribute("type", "range");
        input.classList.add(
            "w-full",
            "h-6",
            "px-0.5",
            "rounded-lg",
            "bg-blue-200",
            "appearance-none",
            "dark:bg-gray-700",
            "focus:ring-blue-200",
            "dark:focus:ring-blue-800"
        );
        input.setAttribute("min", item.min);
        input.setAttribute("max", item.max);
        input.setAttribute("value", item.value);
        input.setAttribute("step", item.step);

        leftSide.appendChild(label);
        leftSide.appendChild(input);
        sliders.push(input);
    });

    // Right side with images
    const rightSide = document.createElement("div");
    rightSide.classList.add("w-1/3", "relative", "mr-3");

    const imageInput = document.createElement("input");
    imageInput.setAttribute("type", "file");
    imageInput.setAttribute("accept", "image/*");
    imageInput.classList.add("hidden");

    const firstImage = document.createElement("img");
    firstImage.setAttribute("src", "img/card-no-preview.png");
    firstImage.classList.add("aspect-square", "h-full", "object-contain");

    const secondImage = document.createElement("img");
    secondImage.setAttribute("src", "");
    secondImage.classList.add("z-20", "border-0", "absolute", "inset-0", "aspect-square", "h-full", "object-contain", "hover:hidden","transition-all","duration-300");

    rightSide.appendChild(imageInput);
    rightSide.setAttribute("onclick", "this.children[0].click()");
    rightSide.appendChild(firstImage);
    rightSide.appendChild(secondImage);

    // Append left and right sides to the imageAndSliders div
    imageAndSliders.appendChild(leftSide);
    imageAndSliders.appendChild(rightSide);

    // Add the imageAndSliders to the main container
    container.appendChild(imageAndSliders);

    // Add the last section
    const lastSection = document.createElement("div");
    lastSection.classList.add("flex");

    // Left column with Control Mode and Resize Mode dropdowns
    const leftColumn = document.createElement("div");
    leftColumn.classList.add("w-1/2", "mx-2", "flex", "flex-col", "gap-2");

    // Control Mode Dropdown
    const controlModeLabel = document.createElement("label");
    controlModeLabel.setAttribute("for", "control-mode");
    controlModeLabel.classList.add("text-sm", "font-medium");
    controlModeLabel.innerText = "Control Mode";

    const controlModeDropdown = document.createElement("select");
    controlModeDropdown.id = "control-mode";
    controlModeDropdown.classList.add(
        "flex-grow",
        "bg-white",
        "border",
        "pr-10",
        "pl-2",
        "py-2",
        "border-gray-300",
        "text-gray-900",
        "text-sm",
        "rounded-lg",
        "focus:ring-primary-500",
        "focus:border-primary-500",
        "block",
        "dark:bg-gray-600",
        "dark:border-gray-500",
        "dark:placeholder-gray-400",
        "dark:text-white",
        "dark:focus:ring-primary-500",
        "dark:focus:border-primary-500"
    );
    // Add options for Control Mode dropdown
    const controlModeOptions = [
        { value: "0", label: "Balanced", title: "balanced, no preference between prompt and control model" },
        { value: "1", label: "Prompt", title: "the prompt has more impact than the model" },
        { value: "2", label: "ControlNet", title: "the controlnet model has more impact than the prompt" },
    ];
    controlModeOptions.forEach((option) => {
        const controlOption = document.createElement("option");
        controlOption.value = option.value;
        controlOption.innerText = option.label;
        controlOption.title = option.title;
        controlModeDropdown.appendChild(controlOption);
    });

    // Resize Mode Dropdown
    const resizeModeLabel = document.createElement("label");
    resizeModeLabel.setAttribute("for", "resize-mode");
    resizeModeLabel.classList.add("text-sm", "font-medium");
    resizeModeLabel.innerText = "Resize Mode";

    const resizeModeDropdown = document.createElement("select");
    resizeModeDropdown.id = "resize-mode";
    resizeModeDropdown.classList.add(
        "flex-grow",
        "bg-white",
        "border",
        "pr-10",
        "pl-2",
        "py-2",
        "border-gray-300",
        "text-gray-900",
        "text-sm",
        "rounded-lg",
        "focus:ring-primary-500",
        "focus:border-primary-500",
        "block",
        "dark:bg-gray-600",
        "dark:border-gray-500",
        "dark:placeholder-gray-400",
        "dark:text-white",
        "dark:focus:ring-primary-500",
        "dark:focus:border-primary-500"
    );
    // Add options for Resize Mode dropdown
    const resizeModeOptions = [
        { value: "0", label: "Resize", title: "simply resize the image to the target width/height" },
        { value: "1", label: "Scale", title: "scale and crop to fit smallest dimension. preserves proportions." },
        { value: "2", label: "Envelope", title: "scale to fit largest dimension. preserves proportions." },
    ];
    resizeModeOptions.forEach((option) => {
        const resizeOption = document.createElement("option");
        resizeOption.value = option.value;
        resizeOption.innerText = option.label;
        resizeOption.title = option.title;
        resizeModeDropdown.appendChild(resizeOption);
    });


    // Right column with Processor and Model dropdowns (on the same line)
    const rightColumn = document.createElement("div");
    rightColumn.classList.add("w-1/2", "mr-2", "flex", "flex-col", "gap-2");

    // Processor Dropdown
    const processorLabel = document.createElement("label");
    processorLabel.setAttribute("for", "processor");
    processorLabel.classList.add("text-sm", "font-medium");
    processorLabel.innerText = "Processor";

    const processorDropdown = document.createElement("select");
    processorDropdown.id = "processor";
    processorDropdown.classList.add(
        "flex-grow",
        "bg-white",
        "border",
        "pr-10",
        "pl-2",
        "py-2",
        "border-gray-300",
        "text-gray-900",
        "text-sm",
        "rounded-lg",
        "focus:ring-primary-500",
        "focus:border-primary-500",
        "block",
        "dark:bg-gray-600",
        "dark:border-gray-500",
        "dark:placeholder-gray-400",
        "dark:text-white",
        "dark:focus:ring-primary-500",
        "dark:focus:border-primary-500"
    );
    // Add options for Processor dropdown
    const processorOptions = [
        // Add your processor options here
    ];
    processorOptions.forEach((option) => {
        const processorOption = document.createElement("option");
        processorOption.value = option.value;
        processorOption.innerText = option.label;
        processorDropdown.appendChild(processorOption);
    });

    // Model Dropdown (similar to Processor dropdown)
    const modelLabel = document.createElement("label");
    modelLabel.setAttribute("for", "model");
    modelLabel.classList.add("text-sm", "font-medium");
    modelLabel.innerText = "Model";

    const modelDropdown = document.createElement("select");
    modelDropdown.id = "model";
    modelDropdown.classList.add(
        "flex-grow",
        "bg-white",
        "border",
        "pr-10",
        "pl-2",
        "py-2",
        "border-gray-300",
        "text-gray-900",
        "text-sm",
        "rounded-lg",
        "focus:ring-primary-500",
        "focus:border-primary-500",
        "block",
        "dark:bg-gray-600",
        "dark:border-gray-500",
        "dark:placeholder-gray-400",
        "dark:text-white",
        "dark:focus:ring-primary-500",
        "dark:focus:border-primary-500"
    );
    // Add options for Model dropdown
    const modelOptions = [
        // Add your model options here
    ];
    modelOptions.forEach((option) => {
        const modelOption = document.createElement("option");
        modelOption.value = option.value;
        modelOption.innerText = option.label;
        modelDropdown.appendChild(modelOption);
    });

    leftColumn.appendChild(controlModeLabel);
    leftColumn.appendChild(controlModeDropdown);
    leftColumn.appendChild(processorLabel);
    leftColumn.appendChild(processorDropdown);


    rightColumn.appendChild(resizeModeLabel);
    rightColumn.appendChild(resizeModeDropdown);
    rightColumn.appendChild(modelLabel);
    rightColumn.appendChild(modelDropdown);

    lastSection.appendChild(leftColumn);
    lastSection.appendChild(rightColumn);


    // Add the last section to the main container
    container.appendChild(lastSection);


    //------------ Add event listeners ------------//
    toggleInput.addEventListener("change", (e) => {
        ControlNetUnits[index].enabled = e.target.checked;
        console.log(ControlNetUnits[index]);
        updateControlNetAmountText();
    });
    controlTypeDropdown.addEventListener("change", (e) => {
        SetOptionsToDropdown(processorDropdown, controlTypes["control_types"][e.target.value]["module_list"]);
        processorDropdown.value = controlTypes["control_types"][e.target.value]["default_option"];
        SetOptionsToDropdown(modelDropdown, controlTypes["control_types"][e.target.value]["model_list"]);
        modelDropdown.value = controlTypes["control_types"][e.target.value]["default_model"];
        processorDropdown.dispatchEvent(new Event("change"));
        modelDropdown.dispatchEvent(new Event("change"));
    });
    modelDropdown.addEventListener("change", (e) => {
        ControlNetUnits[index].model = e.target.value;
    });
    deleteButton.addEventListener("click", (e) => {
        ControlNetUnits[index] = null;
        container.remove();
        updateControlNetAmountText();
    });
    //sliders
    sliders[0].addEventListener("input", (e) => {
        ControlNetUnits[index].weight = e.target.value;
    });
    sliders[1].addEventListener("input", (e) => {
        ControlNetUnits[index].guidance_start = e.target.value;
    });
    sliders[2].addEventListener("input", (e) => {
        ControlNetUnits[index].guidance_end = e.target.value;
    });
    controlModeDropdown.addEventListener("change", (e) => {
        ControlNetUnits[index].control_mode = e.target.value;
    });
    resizeModeDropdown.addEventListener("change", (e) => {
        ControlNetUnits[index].resize_mode = e.target.value;
    });
    imageInput.addEventListener("change", (e) => {
        //make uploaded image base64
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                ControlNetUnits[index].initImage = reader.result;
                firstImage.src = reader.result;
                secondImage.src = "loading.gif"
                console.log(reader.result.split(",")[1]);
                ControlnetDetect(processorDropdown.value, reader.result.split(",")[1], index, secondImage);
            };
        }
    });
    processorDropdown.addEventListener("change", (e) => {
        ControlNetUnits[index].module = e.target.value;
        if(ControlNetUnits[index].initImage != null){
            ControlnetDetect(e.target.value, ControlNetUnits[index].initImage.split(",")[1], index, secondImage);
        }
    });

    rightSide.addEventListener("mouseover", (e) => {
        secondImage.classList.add("opacity-0")
        secondImage.classList.remove("opacity-100")

    });
    rightSide.addEventListener("mouseout", (e) => {
        secondImage.classList.add("opacity-100")
        secondImage.classList.remove("opacity-0")
    });
    

    //------------ Set default values ------------//
    controlTypeDropdown.dispatchEvent(new Event("change"));
    modelDropdown.dispatchEvent(new Event("change"));
    sliders[0].dispatchEvent(new Event("input"));
    sliders[1].dispatchEvent(new Event("input"));
    sliders[2].dispatchEvent(new Event("input"));
    controlModeDropdown.dispatchEvent(new Event("change"));
    resizeModeDropdown.dispatchEvent(new Event("change"));



    ControlnetContainer.appendChild(container);
}


function SetOptionsToDropdown(dropdown, options) {
    dropdown.innerHTML = "";
    for (var i = 0; i < options.length; i++) {
        var option = document.createElement("option");
        option.value = options[i];
        option.text = options[i];
        dropdown.appendChild(option);
    }
}

async function ControlnetDetect(module, base64,index,image) {
    image.src = "loading.gif"
    ControlNetUnits[index].Image = null;
    var payload = {
        "controlnet_module": module,
        "controlnet_input_images": [base64]
    };
    fetch(url + '/controlnet/detect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    }).then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            image.src = "data:image/png;base64," + data["images"][0];
            ControlNetUnits[index].Image = data["images"][0];
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

//start
function ControlNetInit() {
    getControlnetSettings()
    getControlTypes()
}

function updateControlNetAmountText(){
    let amount = 0;
    for (i = 0; i < ControlNetUnits.length; i++) {
        if(ControlNetUnits[i]){
            if(ControlNetUnits[i].enabled){
                amount++;
            }
        }
    }
    ControlnetActiveText.innerText = amount + " active";
}
function GetControlNet(){



    var args = [];

    if (ControlnetEnable.checked) {
        ControlNetUnits.forEach(unit => {
            if(unit?.enabled){
                let arg = {}
                if (unit.image == null || unit.image == "" || unit.image == "loading.gif"){
                    arg["input_image"] = unit.initImage.replace("data:image/png;base64,","");
                    arg["module"] = unit.module;
                }else{
                    arg["input_image"] = unit.Image.replace("data:image/png;base64,","")
                }
                arg["model"] = unit.model;
                arg["weight"] = parseFloat(unit.weight);
                arg["guidance_start"] = parseFloat(unit.guidance_start);
                arg["guidance_end"] = parseFloat(unit.guidance_end);
                arg["control_mode"] = parseInt(unit.control_mode);
                arg["resize_mode"] = parseInt(unit.resize_mode);
                args.push(arg);
            }
        });
    }

    var controlnet = {
        "args": args,
    }
    return controlnet;
}



// event listeners
addControlnetBtn.addEventListener("click", AddControlNetUnit);
ControlnetEnable.addEventListener("change", (e) => {
    console.log(GetControlNet());
    if (e.target.checked) {
        ControlnetActiveText.classList.remove("hidden");
    } else {
        ControlnetActiveText.classList.add("hidden");
    }
});

