import os

def rename_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.png'):
                file_path = os.path.join(root, file)
                new_file_path = os.path.join(root, file.replace('.preview', ''))
                os.rename(file_path, new_file_path)
                print(f"Renamed file: {file} -> {new_file_path}")

# Provide the directory path where you want to rename the files
directory_path = 'D:\AI\stable-diffusion-webui-ux\models\Lora'
rename_files(directory_path)
