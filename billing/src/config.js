export const API_URL = import.meta.env.PROD 
  ? 'https://billing-server-gaha.onrender.com' 
  : '';

export const fetchWithRetry = async (url, options = {}, retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        if (i === retries - 1) {
          throw new Error('Server busy - please try again in a moment');
        }
        console.log(`⏳ Rate limited, retrying in ${delay}ms... (Attempt \${i + 1}/\${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`❌ Request failed, retrying in \${delay}ms... (\${error.message})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5;
    }
  }
};
