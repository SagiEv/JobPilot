import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const uploadCSV = async (file, type) => {
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const response = await api.post('/api/csv/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to upload CSV')
  }
}

export const saveApplications = async (applications) => {
  try {
    const response = await api.post('/api/applications/save', { applications })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to save applications')
  }
}

export const saveNetwork = async (contacts) => {
  try {
    const response = await api.post('/api/network/save', { contacts })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to save contacts')
  }
}

export const checkHealth = async () => {
  try {
    const response = await api.get('/api/health')
    return response.data
  } catch (error) {
    throw new Error('Backend is not available')
  }
}

export default api
