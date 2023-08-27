import json
from urllib import request, parse
import random

#This is the ComfyUI api prompt format.

#If you want it for a specific workflow you can "enable dev mode options"
#in the settings of the UI (gear beside the "Queue Size: ") this will enable
#a button on the UI to save workflows in api format.

#keep in mind ComfyUI is pre alpha software so this format will change a bit.

#this is the one for the default workflow
prompt_text = """
{"3":{"inputs":{"model":["4",0],"seed":"0","steps":"20","cfg":"8","sampler_name":"euler","scheduler":"normal","positive":["6",0],"negative":["7",0],"latent_image":["5",0],"denoise":"1"},"class_type":"KSampler"},"4":{"inputs":{"ckpt_name":"CounterfeitV25_25.safetensors"},"class_type":"CheckpointLoaderSimple"},"5":{"inputs":{"width":"512","height":"512","batch_size":"1"},"class_type":"EmptyLatentImage"},"6":{"inputs":{"text":"masterpiece","clip":["4",1]},"class_type":"CLIPTextEncode"},"7":{"inputs":{"text":"blush,extra fingers,fewer fingers,(low quality, worst quality:1.4), (bad anatomy), (inaccurate limb:1.2),bad composition, inaccurate eyes, extra digit,fewer digits,(extra arms:1.2),easynegative","clip":["4",1]},"class_type":"CLIPTextEncode"},"8":{"inputs":{"samples":["3",0],"vae":["4",2]},"class_type":"VAEDecode"},"9":{"inputs":{"images":["8",0],"filename_prefix":"ComfyUI"},"class_type":"SaveImage"}}
"""

def queue_prompt(prompt):
    p = {"prompt": prompt}
    data = json.dumps(p).encode('utf-8')
    req =  request.Request("http://127.0.0.1:8188/prompt", data=data)
    request.urlopen(req)


prompt = json.loads(prompt_text)
#set the text prompt for our positive CLIPTextEncode



queue_prompt(prompt)