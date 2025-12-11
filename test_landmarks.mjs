import fetch from 'node-fetch';
import fs from 'fs';

// Create a simple test - just check if endpoint responds
const testImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

console.log('Testing landmark endpoint...');

try {
  const response = await fetch('http://localhost:3000/api/trpc/verification.getLandmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      json: { imageBase64: testImage }
    })
  });
  
  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response data:', JSON.stringify(data, null, 2));
  
  if (data?.result?.data?.landmarks) {
    console.log('\n✓ Landmarks received:', data.result.data.landmarks.length, 'face(s)');
    if (data.result.data.landmarks[0]) {
      console.log('✓ First face has', data.result.data.landmarks[0].landmarks?.length || 0, 'landmarks');
    }
  } else {
    console.log('\n✗ No landmarks in response');
  }
} catch (error) {
  console.error('✗ Test failed:', error.message);
}
