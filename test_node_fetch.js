const fs = require('fs');
const FormData = require('form-data'); // Try using form-data library if global one fails
const path = require('path');

async function testFetch() {
    try {
        // First try the native way exactly like ai.routes.js
        console.log("Testing native FormData like ai.routes.js...");
        const nativeFormData = new globalThis.FormData();
        const buffer = fs.readFileSync('ml_service/test.jpg');
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        nativeFormData.append('file', blob, 'test.jpg');

        const res1 = await fetch('http://127.0.0.1:5001/predict-skin', {
            method: 'POST',
            body: nativeFormData
        });

        if (!res1.ok) {
            console.error("Native FormData failed:", res1.statusText, await res1.text());
        } else {
            console.log("Native FormData success:", await res1.json());
        }
    } catch(err) {
        console.error("Native fetch err:", err);
    }
}

testFetch();
