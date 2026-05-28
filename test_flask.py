import requests
import io
from PIL import Image

# create dummy image
img = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_byte_arr.seek(0)

# send to python
files = {'file': ('test.jpg', img_byte_arr, 'image/jpeg')}
try:
    response = requests.post('http://127.0.0.1:5001/predict-skin', files=files)
    print("Status:", response.status_code)
    print("JSON:", response.json())
except Exception as e:
    print("Error:", e)
