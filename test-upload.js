const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    const form = new FormData();
    
    // Add a test image (replace with a path to a real image file)
    const imagePath = path.join(__dirname, 'public', 'test-image.jpg');
    form.append('image', fs.createReadStream(imagePath));
    form.append('title', 'Test Image');
    form.append('description', 'Test Description');
    form.append('category', 'test');
    form.append('isFeatured', 'false');

    const response = await axios.post('http://localhost:5000/api/gallery', form, {
      headers: {
        ...form.getHeaders(),
        'Content-Length': form.getLengthSync(),
      },
    });

    console.log('Upload successful:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testUpload();
