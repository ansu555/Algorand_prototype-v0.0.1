// Test script to verify API returns projects correctly
const API_URL = 'http://localhost:3000/api/launchpad/projects'

async function testAPI() {
  try {
    console.log('Fetching projects from:', API_URL)
    const response = await fetch(API_URL)
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      return
    }
    
    const data = await response.json()
    console.log('\nProjects returned by API:', JSON.stringify(data, null, 2))
    console.log('\nNumber of projects:', Array.isArray(data) ? data.length : 'Not an array')
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

testAPI()
